require('dotenv').config();
const express = require('express')
app = express()
require('express-async-errors');

const cors = require('cors')
const http = require('http')
const favicon = require('express-favicon');
const logger = require('morgan')
const { Server } = require('socket.io')

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
})

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(logger('dev'));
app.use(express.static('public'))
app.use(favicon(__dirname + '/public/favicon.ico'));


let rooms = []

/* initial user connection to sockets */
io.on("connection", (socket) => {
    // maxRooms = rooms.filter(room => room.players.length<10)
    console.log(`User ${socket.id} connected`);


    
    // socket.on("check_available_rooms",()=>{
        if (rooms.length > 0) {
            maxRooms = rooms.filter(room => room.players.length < 10) // Can this be a function?
            availableRooms = maxRooms.map(room => room.room)
            io.to(socket.id).emit('available_rooms', availableRooms)
        }
    // })



    /* create a room function with a maximum number of 10 */
    socket.on('create_room', data => {
        socket.join(String(rooms.length + 1))
        io.to(socket.id).emit('room_number', rooms.length + 1)

        rooms.push({
            room: rooms.length + 1,
            words: [],
            players: [{
                id: socket.id,
                userName: data, 
                word: '',
                roundsWon:0
            }]
        })

        maxRooms = rooms.filter(room => room.players.length < 10)
        availableRooms = maxRooms.map(room => room.room)
        console.log(availableRooms, 'available rooms');
        io.emit('available_rooms', availableRooms)
    })

    /* allows users to join different rooms - prompts name upon joining */
    socket.on('join_room', (data) => {
        socket.join(data.room)
        console.log(`user joined the room`)

        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].room == data.room) {
                rooms[i].players.push({ id: socket.id, userName: data.userName, word: '',roundsWon:0 })
                players = rooms[i].players.map(player => player.userName)
                io.to(String(data.room)).emit('players', players)
                return
            }
        }
    })

    /* allows users to leave rooms */
    //TODO: remove username when leaving room
    socket.on('leave_room', (data) => {
        socket.leave(data)
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].room == data) {
                const index = rooms[i].players.indexOf(socket.id)
                rooms[i].players.splice(index, 1)
                return
            }
        }
    })

    /* disconnects user from socket */
    socket.on('disconnect', () => {
        console.log('user disconnected');
    })

    /* allows users to send word or phreases
     * only starts games when all players have sent a word
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
            console.log("LLego!!!");
            if (rooms[i].players.length > 2 &&
                rooms[i].players.every(player => player.word != '')) {

                console.log("All ready");
                io.to(String(rooms[i].room)).emit('all_players_ready')
            } 
        }
    })

    socket.on('start_game',(data)=>{
        for (let i=0; i<rooms.length; i++){
            if(rooms[i].room==data) {
                rooms[i].playersGuessed=0
                let random = Math.floor(Math.random()*rooms[i].words.length)
                let wordToGuess = rooms[i].words.splice(random,1)[0]
                rooms[i].wordToGuess = wordToGuess
                for(const player of rooms[i].players ){
                    if(player.word!==wordToGuess){
                        io.to(player.id).emit('word_to_guess', wordToGuess.length)
                    }else{
                        io.to(player.id).emit('guessing_your_word')
                    }
                }
                
            }
        }
    })

    socket.on('guess_word',data=>{
        for(const room of rooms){
            if(room.room==data.room && room.wordToGuess===data.word) {
                
                io.to(socket.id).emit('right')
                console.log(room.words.length,'palabras que quedan');
                //When a player guesses right we increase the playersGuessed count and we check if all the rest guessed
                //If so we tell the host he can start next round
                room.playersGuessed++
                if(room.playersGuessed==1){
                    //all the next code is to keep track of the rounds won of every player
                    idsArr = room.players.map(player=>player.id)
                    const index = idsArr.indexOf(socket.id)
                    console.log(index,'index');
                    room.players[index].roundsWon++
                }
                if(room.playersGuessed==(room.players.length-1)) {
                    //We check if we used all the words of all players, if not we tell the host(players[0]) can start next round
                    if(room.words.length>0) io.to(String(room.players[0].id)).emit('all_players_guessed')
                    //If we used all the words of all players the game is over
                    else {
                        io.to(String(room.room)).emit('game_over')
                        console.log(room.players,'room.players');
                        scoreArr = room.players.map(player=>player.roundsWon)
                        console.log(scoreArr,'scoreArr');
                        const i= scoreArr.indexOf(Math.max(...scoreArr))
                        console.log(room.players[i],'player with high score');
                        io.to(String(room.room)).except(String(room.players[i].id)).emit('winner',room.players[i].userName)
                        io.to(String(room.players[i].id)).emit('you_won')
                        //When the game is over we need to reset some values of every player because maybe the players want to play a new game 
                        for(const player of room.players){
                            player.word = ''
                            player.roundsWon=0
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
})

const port = 3001;
const start = () => {
    try {
        server.listen(port, () =>
            console.log(`app is listening on port ${port}...`));
    } catch (error) {
        console.log(error);
    }
};

start();
module.exports = app;