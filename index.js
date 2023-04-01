const express = require('express')
app = express()
const http = require('http')
const {Server} = require('socket.io')
const cors =  require('cors')
const { create } = require('domain')
const { log } = require('console')

app.use(cors())
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET","POST"]
    }
})

let rooms = []
io.on("connection", (socket)=>{
// lessThanTeen = rooms.filter(room => room.players.length<10)

    if(rooms.length>0){
        lessThanTeen = rooms.filter(room => room.players.length<10)
        availableRooms = lessThanTeen.map(room=> room.room)
        console.log(rooms,'rooms');
        console.log(availableRooms,'available rooms');
        io.to(socket.id).emit('available_rooms',availableRooms)
    }

    socket.on('create_room',data=>{
        socket.join(String(rooms.length+1))
        io.to(socket.id).emit('room_number',rooms.length+1)
        rooms.push({room:rooms.length+1,words:[],players:[{id:socket.id,userName:data, word:''}]})
        lessThanTeen = rooms.filter(room => room.players.length<10)
        availableRooms = lessThanTeen.map(room=>room.room)
        console.log(availableRooms,'availableRooms');
        io.emit('available_rooms',availableRooms)
    })

    socket.on('join_room',(data)=>{
        socket.join(data.room)
        for (let i=0; i<rooms.length; i++){
            if(rooms[i].room == data.room) {
                rooms[i].players.push({id:socket.id,userName:data.userName ,word:''})
                players = rooms[i].players.map(player=>player.userName)
                io.to(String(data.room)).emit('players', players)
                return
            }
        }
    })
    
    socket.on('leave_room',(data)=>{
        socket.leave(data)
        for (let i=0; i<rooms.length; i++){
            if(rooms[i].room == data) {
                const index = rooms[i].players.indexOf(socket.id)
                rooms[i].players.splice(index,1)
                return
            }
        }
    })

    socket.on('disconnect', () => {
        console.log(`${socket.id} disconnected`); 
    })

    socket.on('send_word',(data)=>{
        // socket.to(data.room).emit('receive_message',data.message)
        for (let i=0; i<rooms.length; i++){
            if(rooms[i].room == data.room) {
                for(player of rooms[i].players){
                    if(player.id===socket.id) {
                        player.word = data.word
                        rooms[i].words.push(data.word)
                    }
                }
            }
            console.log("LLego!!!");
            if(rooms[i].players.length>2 && rooms[i].players.every(player => player.word!='')){
                console.log("All ready");
                io.to(String(rooms[i].room)).emit('all_players_ready')
            } 
        }
    })


    socket.on('start_game',(data)=>{
        for (let i=0; i<rooms.length; i++){
            if(rooms[i].room==data) {
                let wordToGuess = rooms[i].words[Math.floor(Math.random()*rooms[i].words.length)]
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
            if(room.room==data.room && room.wordToGuess===data.word) io.to(socket.id).emit('right')
        }
    })
    

})

server.listen(3001, ()=>{
    console.log("SERVER RUNNING");
})