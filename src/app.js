/* module setup */
require('dotenv').config();
const express = require('express');
require('express-async-errors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const http = require('http');
const MongoDBStore = require("connect-mongodb-session")(session);
const connectDB = require('./db/connect');
const authenticateUser = require('./middleware/authentication')
const app = express();
const fetch = require("node-fetch");
const datamuse = require('datamuse');

/** extra security packages */
const cors = require('cors')
const favicon = require('express-favicon');
const logger = require('morgan')


app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET));
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(logger('dev'));
app.use(express.static('public'))
app.use(favicon(__dirname + '/public/favicon.ico'));

/* routers */
const authRouter = require('./routes/auth');
const mainRouter = require('./routes/mainRouter.js');
const userRouter = require('./routes/user.js')
const userNamesRouter = require('./routes/userNames')
let activeUsersApp = []


app.use('/api/v1/auth', authRouter)
app.use('/api/v1/user',authenticateUser,userRouter);
app.use('/', mainRouter)
app.get("/active-users", (req, res) => {
    res.send(activeUsersApp);
});
app.use('/', userNamesRouter)


/* middleware */
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);


/* database connection */
const url = process.env.MONGO_URI;

const store = new MongoDBStore({
    // may throw an error, which won't be caught
    uri: url,
    collection: "mySessions",
});
store.on("error", function (error) {
    console.log(error);
});


const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
})

/**************  sockets start below *****************/


const User = require('./models/User')

let notAvailableUserNames = []
let registeredUserNames
let rooms = []

//This function is called after connects to mongoDB (at the bottom of this file) and pulls all the registered user names
const getUserNames = async (req, res) => {
    const users = await User.find()
    //We'll use this array later to check if an user name is already taken and if not added to this arr, this for players who don't want to register.
    registeredUserNames = users.map(user => user.username)
    notAvailableUserNames = [...registeredUserNames]
}

/* initial user connection to sockets */
io.on("connection", (socket) => {
    console.log(`User connected`);
    //At the moment of connection we receive the name of the user and if it's registered,
    socket.on('user_name', ({ userName, registeredUser }) => {
        console.log(userName, registeredUser, 'data from user_name event');
        //We check if it's a registered user
        if (!registeredUser) {
            const existingUsername = notAvailableUserNames.includes(userName)
            //If the user name exist we return an event to tell the front.
            if (existingUsername) return socket.emit('existing_user_name', userName)
            //If the user name does not exist we add it to the notAvailableUserNames arr to avoid repetitions.
            else {
                notAvailableUserNames.push(userName)
                socket.emit('user_name_accepted')
                console.log(`User ${userName} connected`);
            }
        }
        // If The user is registered we just push the name to active users because the check was done at the registration 
        activeUsersApp.push({ id: socket.id, userName: userName, room: 'lobby' })
    })
    //Once the player is on Game Lobby sends a request for available rooms
    socket.on('search_for_rooms',()=>{
        if (rooms.length > 0) {
            availableRoomsFun('we connect')
        }
    })

    //maxRooms let us check we don't have more than 10 players in a room
    function availableRoomsFun(reason) {
        maxRooms = rooms.filter(room => room.players.length < 10) // Can this be a function?
        availableRooms = maxRooms.map(room => {
            const players = room.players.map(player => player.userName)
            const roomNumber = room.room
            return (
                { roomNumber, players }
            )
        })
        io.emit('available_rooms', availableRooms)
        console.log(availableRooms, 'available rooms after', reason)
    }


    //The next function let us track the room of every connected player
    function roomOfActiveUser(id, room) {
        arrayOfUsersIds = activeUsersApp.map(user => user.id)
        const index = arrayOfUsersIds.indexOf(id)
        activeUsersApp[index] = { ...activeUsersApp[index], room: room }

    }

    /* create a room function with a maximum number of 10 */
    socket.on('create_room', data => {
        socket.join(String(rooms.length + 1))
        io.to(socket.id).emit('room_number', rooms.length + 1)

        roomOfActiveUser(socket.id, String(rooms.length + 1))

        rooms.push({
            room: String(rooms.length + 1),
            words: [],
            players: [{
                id: socket.id,
                userName: data,
                word: '',
                roundsWon: 0
            }]
        })

        maxRooms = rooms.filter(room => room.players.length < 10)
        availableRooms = maxRooms.map(room => {
            const players = room.players.map(player => player.userName)
            const roomNumber = room.room
            return (
                { roomNumber, players }
            )
        })
        availableRoomsFun('creating a room')
    })

    /* allows users to join different rooms - prompts name upon joining */
    socket.on('join_room', (data) => {
        socket.join(data.room)
        console.log(`user joined the room`)

        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].room == data.room) {
                rooms[i].players.push({ id: socket.id, userName: data.userName, word: '', roundsWon: 0 })
                players = rooms[i].players.map(player => player.userName)
                io.to(String(data.room)).emit('players', players)
            }
        }
        availableRooms = maxRooms.map(room => {
            const players = room.players.map(player => player.userName)
            const roomNumber = room.room
            return (
                { roomNumber, players }
            )
        })
        availableRoomsFun('joining a room')
        roomOfActiveUser(socket.id, data.room)
    })

    /* allows users to leave rooms */
    socket.on('leave_room', (data) => {
        socket.leave(data)
        //We check to find from where we need to remove the player and the info of the player and we do it
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].room == data) {
                arrayOfPlayersIds = rooms[i].players.map(player => player.id)
                const index = arrayOfPlayersIds.indexOf(socket.id)
                rooms[i].players.splice(index, 1)
                io.to(rooms[i].players[0].id).emit('new_host')
                if (rooms[i].players.length === 0) rooms.splice(i, 1)
                else {
                    io.to(rooms[i].players[0].id).emit('new_host')
                    playersLeft = rooms[i].players.map(player => player.userName)
                    io.to(String(data)).emit('players', playersLeft)
                }

            }
            roomOfActiveUser(socket.id, 'looby')
        }
        availableRoomsFun('leaving a room')
    })

    /* disconnects user from socket */
    socket.on('disconnect', () => {
        console.log('user disconnected', socket.id)
        //We check to find from where we need to remove the player and the info of the player and we do it
        if (activeUsersApp.length > 0) {
            //The next code is to check if we need to remove names from active users and remove usernames from not registered users.
            arrayOfUsersIds = activeUsersApp.map(user => user.id)
            const indexB = arrayOfUsersIds.indexOf(socket.id)
            userRegistered = registeredUserNames.includes(activeUsersApp[indexB].userName)
            if (!userRegistered) {
                const i = notAvailableUserNames.indexOf(activeUsersApp[indexB].userName)
                //Here is the case of a non registered user, so the userName can be used for others once disconnects
                notAvailableUserNames.splice(i, 1)
            }
            //Here we remove the user from active users.
            activeUsersApp.splice(indexB, 1)
            console.log(activeUsersApp, 'active users');
            console.log(notAvailableUserNames, 'not available usenames ');
            console.log('entre al IF');
            for (let i = 0; i < rooms.length; i++) {
                console.log('entre al primer FOR');
                for (let ind = 0; ind < rooms[i].players.length; ind++) {
                    console.log('entre al segundo FOR');
                    if (rooms[i].players[ind].id === socket.id) {
                        arrayOfPlayersIds = rooms[i].players.map(player => player.id)
                        const index = arrayOfPlayersIds.indexOf(socket.id)
                        rooms[i].players.splice(index, 1)
                        if (rooms[i].players.length === 0) rooms.splice(i, 1)
                        else {
                            console.log(rooms[i].players, 'players in room left');
                            playersLeft = rooms[i].players.map(player => player.userName)
                            io.to(String(rooms[i].room)).emit('players', playersLeft)
                        }
                        availableRoomsFun('disconnect')
                        return
                    }
                }
            }
        }

    })



    /* allows users to send word or phreases
   * only starts user when all players have sent a word
   */
    socket.on('send_word', (data) => {
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].room == data.room) {
                for (player of rooms[i].players) {
                    if (player.id === socket.id) {
                        player.word = data.word.toLowerCase(); // convert to lowercase
                        rooms[i].words.push(player.word); 
                    }
                }
            }
            if (rooms[i].players.length > 2 &&
                rooms[i].players.every(player => player.word != '')) {
                console.log("All players ready");
                io.to(String(rooms[i].room)).emit('all_players_ready')
            }
        }
    })


    /* raondomly picking a submitted word and setting its synonyms*/
    socket.on('start_game', async (data) => {
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].room == data) {
                rooms[i].playersGuessed = 0
                let random = Math.floor(Math.random() * rooms[i].words.length)
                let wordToGuess = rooms[i].words.splice(random, 1)[0]
                rooms[i].wordToGuess = wordToGuess
                for (const player of rooms[i].players) {
                    if (player.word !== wordToGuess) {
                        // console.log(wordToGuess, ' is the word to guess');
                        try {
                            const hint = await synonyms(wordToGuess);
                            // console.log('server side hint', hint);
                            io.to(player.id).emit('word_to_guess', wordToGuess.length)
                            io.to(player.id).emit('hint', hint) //sends hint to client
                        } catch (error) {
                            console.error(error);
                        }
                    } else {
                        io.to(player.id).emit('guessing_your_word')
                    }
                }
            }
        }
    });

    const synonyms = (word) => {
        return new Promise((resolve, reject) => {
            /* sending general words similar to secret word - better hints */
            datamuse.words({
                rel_gen: word,
                max: 2,
            })
                .then((synonyms) => {
                    /* if general word api call is empty, check synonym api */
                    if (synonyms.length === 0) {
                        return datamuse.words({
                            rel_syn: word,
                            max: 2,
                        })
                            .then((synonyms) => {
                                const hint = `${synonyms.map((s) => s.word).join(', ')}`;
                                resolve(hint);
                            })
                    }
                    const hint = `${synonyms.map((s) => s.word).join(', ')}`;
                    resolve(hint);
                })
                .catch((error) => {
                    console.error(error.message);
                    reject(error.message);
                });
        });
    };

    socket.on('time_off',data => {
        for (const room of rooms) {
            //We look for the right room
            if (room.room == data){
                io.to(socket.id).emit('the_word_was',room.wordToGuess)
                const gameScore = room.players.map(player => {
                    return {player:player.userName, roundsWon:player.roundsWon}
                })
                // Here we send the gameScore, an array with rounds won of every player
                io.to(String(room.room)).emit('game_score', gameScore)
                if (room.words.length > 0) io.to(room.players[0].id).emit('all_ready_for_next_round')
                    //If we used all the words of all players the game is over
                    else {
                        io.to(String(room.room)).emit('game_over')
                        scoreArr = room.players.map(player => player.roundsWon)
                        //we find who has the highest score
                        const i = scoreArr.indexOf(Math.max(...scoreArr))
                        console.log(room.players[i], 'player with high score');
                        //We tell the players who won the game
                        io.to(String(room.room)).except(String(room.players[i].id)).emit('winner', room.players[i].userName)
                        console.log('En TIMEOFF ANTES de enviar YOU WON!!!!!!!!');
                        io.to(String(room.players[i].id)).emit('you_won')
                        //When the game is over we need to reset some values of every player because maybe the players want to play a new game 
                        for (const player of room.players) {
                            player.word = ''
                            player.roundsWon = 0
                        }
                    }
            }
        }
    })

    socket.on('guess_word', data => {
        for (const room of rooms) {
            if (room.room == data.room && room.wordToGuess === data.word) {

                io.to(socket.id).emit('right')
                //When a player guesses right we increase the playersGuessed count and we check if all the rest guessed
                //If so we tell the host he can start next round
                room.playersGuessed++

                if (room.playersGuessed == 1) {
                    //all the next code is to keep track of the rounds won of every player
                    idsArr = room.players.map(player => player.id)
                    const index = idsArr.indexOf(socket.id)
                    room.players[index].roundsWon++
                }
                if (room.playersGuessed == (room.players.length - 1)) {

                    const gameScore = room.players.map(player => {
                        return { player: player.userName, roundsWon: player.roundsWon }
                    })
                    // Here we send the gameScore, an array with rounds won of every player
                    io.to(String(room.room)).emit('game_score', gameScore)
                    //We check if we used all the words of all players, if not we tell the host(players[0]) can start next round
                    if (room.words.length > 0) io.to(String(room.room)).emit('all_ready_for_next_round')
                    //If we used all the words of all players the game is over
                    else {
                        io.to(String(room.room)).emit('game_over')
                        scoreArr = room.players.map(player => player.roundsWon)
                        const i = scoreArr.indexOf(Math.max(...scoreArr))
                        console.log(room.players[i], 'player with high score');
                        io.to(String(room.room)).except(String(room.players[i].id)).emit('winner', room.players[i].userName)
                        console.log('En guessWORD ANTES de enviar YOU WON!!!!!!!!');

                        io.to(String(room.players[i].id)).emit('you_won')
                        //When the game is over we need to reset some values of every player because maybe the players want to play a new game 
                        for (const player of room.players) {
                            player.word = ''
                            player.roundsWon = 0
                        }
                    }
                }

            }
            else if(room.room == data.room && room.wordToGuess !== data.word) {
                io.to(socket.id).emit('wrong')
            }
        }
    })

    /** determine when the secret word is guessed by a user */
    socket.on('guess_word', data => {
        for (const room of rooms) {
            if (room.room == data.room && room.wordToGuess === data.word)
                io.to(socket.id).emit('right')
        }
    })

    // Used for game chat in GameChat.js
    // Listens for message emitted by the front end
    socket.on('send_message', data => {
        // emits data back to everyone including the sender
        io.to(String(data.room)).emit('receive_message', data);
    })
})
const port = process.env.PORT || 4000;
const start = async () => {
    try {
        await connectDB(url);
        server.listen(port, () =>
            console.log(`app is listening on port ${port}...`));
        getUserNames()
    } catch (error) {
        console.log(error);
    }
};
start();    
