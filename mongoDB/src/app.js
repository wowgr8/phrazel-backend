require('dotenv').config();
require('express-async-errors');;

const express = require('express')
app = express()
const http = require('http')
const cors = require('cors')
const favicon = require('express-favicon');
const logger = require('morgan')
const { Server } = require('socket.io')
const { create } = require('domain')

app.use(cors())
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


// routers
const authRouter = require('./routes/auth');
const mainRouter = require('./routes/mainRouter.js');

// routes
app.use('/api/v1/auth', authRouter)
app.use('/api/v1', mainRouter);


// error handler
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);



/** merging original index.js below */

let rooms = []
io.on("connection", (socket) => {

    if (rooms.length > 0) {
        availableRooms = rooms.map(room => room.room)
        io.to(socket.id).emit('available_rooms', availableRooms)
    }

    socket.on('create_room', data => {
        socket.join(String(rooms.length + 1))
        io.to(socket.id).emit('room_number', rooms.length + 1)
        rooms.push({ room: rooms.length + 1, words: [], players: [{ id: socket.id, userName: data, word: '' }] })
        availableRooms = rooms.map(room => room.room)
        io.emit('available_rooms', availableRooms)
    })

    socket.on('join_room', (data) => {
        socket.join(data.room)
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].room == data.room) {
                rooms[i].players.push({ id: socket.id, userName: data.userName, word: '' })
                players = rooms[i].players.map(player => player.userName)
                io.to(String(data.room)).emit('players', players)
                return
            }
        }
    })

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

    socket.on('send_word', (data) => {
        // socket.to(data.room).emit('receive_message',data.message)
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].room == data.room) {
                for (player of rooms[i].players) {
                    if (player.id === socket.id) {
                        player.word = data.word
                        rooms[i].words.push(data.word)
                        return
                    }
                }
            }
        }
    })


    socket.on('start_game', (data) => {
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].room == data) {
                let wordToGuess = rooms[i].words[Math.floor(Math.random() * rooms[i].words.length)]
                rooms[i].wordToGuess = wordToGuess
                io.to(String(data)).emit('word_to_guess', wordToGuess.length)
            }
        }
    })

    socket.on('guess_word', data => {
        for (const room of rooms) {
            if (room.room == data.room && room.wordToGuess === data.word) io.to(socket.id).emit('right')
        }
    })


})

server.listen(3001, () => {
    console.log("SERVER RUNNING");
})

module.exports = app;
