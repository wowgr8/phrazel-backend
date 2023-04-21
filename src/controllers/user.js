const User = require('../models/User')
const {StatusCodes} = require('http-status-codes')
const {BadRequestError,NotFoundError} = require('../errors')

const getUser = async (req,res) =>{
    const { params:{id:_id}} = req
    const user = await User.findOne({username:_id})
    if(!user) throw new NotFoundError (`No user with id ${_id}`)
    res.status(StatusCodes.OK).json({user})
}
const updateUser = async (req,res) => {
    const {params:{id:_id}} = req
    const user = await User.findOneAndUpdate({_id:_id}, req.body,{new:true, runValidators:true})
    if(!user) throw new NotFoundError (`No user with id ${_id}`)
    res.status(StatusCodes.OK).json({user})
}

module.exports = {
    getUser,
    updateUser
}