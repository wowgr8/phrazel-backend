/* module setup */
require('dotenv').config();
const express = require('express');
require('express-async-errors');
const session = require('express-session');
const http = require('http');
const MongoDBStore = require("connect-mongodb-session")(session);
const connectDB = require('./db/connect');
const authenticateUser = require('./middleware/authentication')
const app = express();
const fetch = require("node-fetch") ;

/** extra security packages */
const cors = require('cors')
const favicon = require('express-favicon');
const logger = require('morgan')


app.use(express.json());
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
// const users = require('./routes/activeUsers')
let activeUsersApp = []


app.use('/api/v1/auth', authRouter)
app.use('/api/v1',authenticateUser,userRouter);
app.use('/', mainRouter)
app.get("/active-users", (req, res) => {
    res.send(activeUsersApp);
});
app.use('/', userNamesRouter)
// app.use('/', users)


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

let userNames = []
/**************  sockets start below *****************/

//This function is called after connects to mongoDB (line 330 aprox) and pulls all the registered user names
async function getUserNames(){
    try {
        const response = await fetch("http://localhost:4000/userNames");
        // console.log(`getUserNames responds with status code ${response.status}`);
        const data = await response.json();
        //We'll use this array when a none registered user disconnects
        registeredUserNames = data.userNames
        console.log(registeredUserNames,'registered user names');
        //We'll use this array later to check if an user name is already taken and if not added to this arr, this for players who don't want to register.
        userNames = [...data.userNames]
    } catch (error) {
        console.log("Error occurred: ",error);
    }
}

let rooms = []
/* initial user connection to sockets */
io.on("connection", (socket) => {
    console.log(`User connected`);
    //At the moment of connection we receive the name of the user who is connecting on the event user_name.
    socket.on('user_name',({userName,registeredUser}) => {
        console.log('event user_name');
        //We check if it's a registered user
        if(!registeredUser) {
            const existingUsername = userNames.includes(userName)
            //If the user name exist we return an event to tell the front.
            if(existingUsername) return socket.emit('existing_user_name',userName)
            //If the user name does not exist we add this user name to the active users and UserNames to avoid repetitions.
            else {
                userNames.push(userName)
                socket.emit('user_name_accepted')
            }
        }
        // If The user is registered we just push the name to active users because the check was done at the registration 
        activeUsersApp.push({id:socket.id, userName:userName, room:'lobby' })
        console.log('userNames',userNames);
        console.log('active users',activeUsersApp);
    })
    // socket.on("check_available_rooms",()=>{
    if (rooms.length > 0) {
        maxRooms = rooms.filter(room => room.players.length < 10) // Can this be a function?

        availableRooms = maxRooms.map(room => {
            const players = room.players.map(player=>player.userName)
            const roomNumber = room.room
            return(
                {roomNumber,players}
            )
        })  
        console.log(availableRooms, 'available rooms as soon we connect');
        io.to(socket.id).emit('available_rooms', availableRooms)
    }
    // })



    /* create a room function with a maximum number of 10 */
    socket.on('create_room', data => {
        socket.join(String(rooms.length + 1))
        io.to(socket.id).emit('room_number', rooms.length + 1)

        arrayOfUsersIds= activeUsersApp.map(user=>user.id)
        const index = arrayOfUsersIds.indexOf(socket.id)
        activeUsersApp[index] = {...activeUsersApp[index], room:rooms.length + 1}
        console.log(activeUsersApp,'active users after create room');

        rooms.push({
            room: rooms.length + 1,
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
            const players = room.players.map(player=>player.userName)
            const roomNumber = room.room
            return(
                {roomNumber,players}
            )
        })        
        console.log(availableRooms, 'available rooms after creating a room');
        io.emit('available_rooms', availableRooms)
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
                // return
            }
        }
        availableRooms = maxRooms.map(room => {
            const players = room.players.map(player=>player.userName)
            const roomNumber = room.room
            return(
                {roomNumber,players}
            )
        })        
        console.log(availableRooms, 'available rooms after joining a room');
        io.emit('available_rooms', availableRooms)

        arrayOfUsersIds= activeUsersApp.map(user=>user.id)
        const index = arrayOfUsersIds.indexOf(socket.id)
        activeUsersApp[index] = {...activeUsersApp[index], room:data.room}
        console.log(activeUsersApp,'active users after joining a room');
    })

    /* allows users to leave rooms */
    //TODO: remove username when leaving room
    socket.on('leave_room', (data) => {
        socket.leave(data)
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].room == data) {
                arrayOfPlayersIds= rooms[i].players.map(player=>player.id)
                const index = arrayOfPlayersIds.indexOf(socket.id)
                rooms[i].players.splice(index, 1)
                if (rooms[i].players.length===0) rooms.splice(i, 1)
                else{
                    playersLeft = rooms[i].players.map(player => player.userName)
                    io.to(String(data)).emit('players', playersLeft)
                }

            }
        arrayOfUsersIds= activeUsersApp.map(user=>user.id)
        const index = arrayOfUsersIds.indexOf(socket.id)
        activeUsersApp[index] = {...activeUsersApp[index], room:'lobby'}
        console.log(activeUsersApp,'active users after leaving a room');
        }
        maxRooms = rooms.filter(room => room.players.length < 10)
        availableRooms = maxRooms.map(room => {
            const players = room.players.map(player=>player.userName)
            const roomNumber = room.room
            return(
                {roomNumber,players}
            )
        })        
        console.log(availableRooms, 'available rooms after leaving a room');
        io.emit('available_rooms', availableRooms)
    })

    /* disconnects user from socket */
    socket.on('disconnect', () => {
        console.log('user disconnected');
        //The next code is to check if we need to remove names from active users and remove usernames from not registered users.
        if(activeUsersApp.length>0){
            arrayOfUsersIds= activeUsersApp.map(user=>user.id)
            const index = arrayOfUsersIds.indexOf(socket.id)
            userRegistered = registeredUserNames.includes(activeUsersApp[index].userName)
            if(!userRegistered){
                const i = userNames.indexOf(activeUsersApp[index].userName)
                //Here is the case of a non registered user, so the userName can be used for others once disconnects
                userNames.splice(i,1)
            }
            //Here we remove the user from active users.
            activeUsersApp.splice(index,1)
            console.log(activeUsersApp,'active users after disconnecting');
            console.log(userNames,'NON AVAILABLE USER NAMES');
        }
    })

    /* allows users to send word or phreases
     * only starts user when all players have sent a word
     */
    socket.on('send_word', (data) => {
        // socket.to(data.room).emit('receive_message',data.message)
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].room == data.room) {
                for (player of rooms[i].players) {
                    if (player.id === socket.id) {
                        player.word = data.word
                        rooms[i].words.push(data.word)
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

    socket.on('start_game', (data) => {
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].room == data) {
                rooms[i].playersGuessed = 0
                let random = Math.floor(Math.random() * rooms[i].words.length)
                let wordToGuess = rooms[i].words.splice(random, 1)[0]
                rooms[i].wordToGuess = wordToGuess
                for (const player of rooms[i].players) {
                    if (player.word !== wordToGuess) {
                        io.to(player.id).emit('word_to_guess', wordToGuess.length)
                    } else {
                        io.to(player.id).emit('guessing_your_word')
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
                        return {player:player.userName, roundsWon:player.roundsWon}
                    })
                    // Here we send the gameScore, an array with rounds won of every player
                    io.to(String(room.room)).emit('game_score', gameScore)
                    //We check if we used all the words of all players, if not we tell the host(players[0]) can start next round
                    if (room.words.length > 0) io.to(String(room.players[0].id)).emit('all_players_guessed')
                    //If we used all the words of all players the game is over
                    else {
                        io.to(String(room.room)).emit('game_over')
                        scoreArr = room.players.map(player => player.roundsWon)
                        const i = scoreArr.indexOf(Math.max(...scoreArr))
                        console.log(room.players[i], 'player with high score');
                        io.to(String(room.room)).except(String(room.players[i].id)).emit('winner', room.players[i].userName)
                        io.to(String(room.players[i].id)).emit('you_won')
                        //When the game is over we need to reset some values of every player because maybe the players want to play a new game 
                        for (const player of room.players) {
                            player.word = ''
                            player.roundsWon = 0
                        }
                    }
                }

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
        io.to(String(data.room)).emit('receive_message', data );
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
