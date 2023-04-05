const User = require('../models/User');
const {StatusCodes} = require('http-status-codes');
const {BadRequestError,UnauthenticatedError} = require('../errors');


const register = async (req, res) => {
  const user = await User.create({...req.body})
  const token = user.createJWT()
  
  res
  .status(StatusCodes.CREATED)
  .json({ user: {username:user.username}, token })
}

const login = async (req, res) => {
  const {username, password} = req.body

if(!username || !password){
  throw new BadRequestError('Please provide username and password')
}
const user = await User.findOne({username})
if(!user){
  throw new UnauthenticatedError('Invalid Credentials')
}
const isPasswordCorrect = await user.comparePassword(password)
if(!isPasswordCorrect){
  throw new UnauthenticatedError('Invalid Credentials')
}
// compare password
const token = user.createJWT()
res.status(StatusCodes.OK).json({ user:{username:user.username}, token })
}

module.exports = {
  register,
  login,
};

