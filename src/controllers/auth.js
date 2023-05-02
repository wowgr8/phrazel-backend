const User = require('../models/User');
const Token = require('../models/Token');
const { StatusCodes } = require('http-status-codes');
const { BadRequestError, UnauthenticatedError } = require('../errors');
const { attachCookiesToResponse, createTokenUser } = require('../utils');

const register = async (req, res) => {
  const { username, email, password } = req.body;

  /* Check if username already exists */
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({
        message: 'Username already exists',
        hasUsername: true,
      });
  }
  if (!username) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({
        message: 'Username is required'
      });
  }

  /* Check if email is empty */
  if (!email) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({
        message: 'Email is required'
      });
  }

  /* Check if email already exists */
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({
        message: 'Email already exists',
        hasEmail: true,
      });
  }

  /* create user profile if  */
  const user = await User.create({ username, email, password });
  const token = user.createJWT();
  res
    .status(StatusCodes.CREATED)
    .json({ user, token });
};


/** log in authentication for exiting users */
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new BadRequestError('Please provide username and password');
  }

  const user = await User.findOne({ username });
  if (!user) {
    throw new UnauthenticatedError('Invalid Credentials');
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new UnauthenticatedError('Invalid Credentials');
  }

  const token = await user.createJWT()

  attachCookiesToResponse({ res, user: user });

  return res.status(StatusCodes.OK).json({ user: { username: user.username }, token })


};

module.exports = {
  register,
  login,
};
