const User = require('../models/User')
const {StatusCodes} = require('http-status-codes')
const {BadRequestError,NotFoundError} = require('../errors')

const getGames = async (req,res) =>{
    const { params:{id:userName}} = req
    const user = await User.findOne({username:userName})
    if(!user) throw new NotFoundError (`No user with name ${userName}`)
    res.status(StatusCodes.OK).json({user})
}
const updateGames = async (req,res) => {
    const {body: {gamesWon}, user:{userId}, params:{id:userName}} = req
    const user = await User.findOneAndUpdate({gamesWon:gamesWon}, req.body,{new:true, runValidators:true})
    if(!user) throw new NotFoundError (`No user with name ${userName}`)
    res.status(StatusCodes.OK).json({user})
}

module.exports = {
    getGames,
    updateGames
}