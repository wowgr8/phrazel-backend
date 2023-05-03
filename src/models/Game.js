// const mongoose = require('mongoose')

// const GameSchema = new mongoose.Schema(
//   {
//     username: {
//       type: String,
//       required: [true, 'Please provide username'],
//       trim: true,
//       minlength: 3,
//       maxlength: 30,
//     },
//     gamesWon:{
//       type: Number,
//     default: 0
//     },
//     gamesPlayed:{
//       type: Number,
//     default:0,
//     },
//     createdBy: {
//       type: mongoose.Types.ObjectId,
//       ref: 'User',
//       required: [true, 'Please provide user'],
//     },
//   },
//   { timestamps: true }
// )

// module.exports = mongoose.model('Game', GameSchema)
