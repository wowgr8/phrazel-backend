const User = require('../models/User');
const { StatusCodes } = require('http-status-codes');
const { BadRequestError, UnauthenticatedError } = require('../errors');

const register = async (req, res) => {
  const { username, email, password } = req.body;

  /* Check if username already exists */
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: 'Username already exists' });
  }

  /* Set email to null if it is empty */
  const emailValue = email === "" ? null : email;

  /* Check if email already exists */
  const existingEmail = await User.findOne({ email: emailValue });
  if (existingEmail && existingEmail !== null) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: 'Email already exists' });
  }
  /** allow multiple users sign up without an email */
  //TODO: email verification does not allow multiple null emails
  if (emailValue === null) {
    const user = await User.create({ username, email: null, password });
    const token = user.createJWT();
    return res
      .status(StatusCodes.CREATED)
      .json({ user: { username: user.username }, token });
  };

  const user = await User.create({ username, email: emailValue, password });
  const token = user.createJWT();
  res
    .status(StatusCodes.CREATED)
    .json({ user: { username: user.username }, token });
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

  const token = user.createJWT();
  res.status(StatusCodes.OK).json({ user: { username: user.username }, token });
};

module.exports = {
  register,
  login,
};
