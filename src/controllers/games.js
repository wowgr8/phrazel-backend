// const Game = require('../models/Game')
// const { StatusCodes } = require('http-status-codes')
// const { BadRequestError, NotFoundError } = require('../errors')

// const getAllGames = async (req, res) => {
//   const games = await Game.find({ createdBy: req.user.userId }).sort('createdAt')
//   res.status(StatusCodes.OK).json({ games, count: games.length })
// };
// // const getGame = async (req, res) => {
// //   const {
// //     user: { userId },
// //     params: { id: gameId },
// //   } = req

// //   const game = await Game.findOne({
// //     _id: gameId,
// //     createdBy: userId,
// //   })
// //   if (!game) {
// //     throw new NotFoundError(`No game with id ${gameId}`)
// //   }
// //   res.status(StatusCodes.OK).json({ game })
// // }

// // const createGame = async (req, res) => {
// //   req.body.createdBy = req.user.userId
// //   const game = await Game.create(req.body)
// //   res.status(StatusCodes.CREATED).json({ game })
// // }


// module.exports = {
//   getAllGames,
// }
