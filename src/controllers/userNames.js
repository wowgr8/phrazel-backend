const User = require('../models/User')
const {StatusCodes} = require('http-status-codes')
const {BadRequestError,NotFoundError} = require('../errors')

const getUserNames = async (req,res) =>{
    const users = await User.find()
    const userNames = users.map(user=>user.username)
    res.status(StatusCodes.OK).json({userNames})
}

module.exports = {
    getUserNames
}