const User = require('../models/User')
const {StatusCodes} = require('http-status-codes')
const {BadRequestError,NotFoundError,UnauthenticatedError} = require('../errors')
const {attachCookiesToResponse, createTokenUser} = require('../utils');


// const updateUser = async (req,res) => {
//     const {params:{id:_id}} = req
//     console.log(req.body,'body of update');
//     const user = await User.findOneAndUpdate({_id:_id}, req.body,{new:true, runValidators:true})
//     if(!user) throw new NotFoundError (`No user with id ${_id}`)
//     res.status(StatusCodes.OK).json({user})
// }

//update user with user.save()
const updateUser = async (req, res) => {
  
  const {username, email } = req.body;
  if (!email || !username) {
    throw new BadRequestError('Please provide all values');
  }
  const user = await User.findOne({ _id: req.user.userId });
  
  user.email = email;
  user.username = username;

  await user.save();

const _id = req.user.userId;

const tokenUser = createTokenUser(user);
attachCookiesToResponse({ res, user: tokenUser });
res.status(StatusCodes.OK).json({ user: tokenUser, msg:`User with ID ${_id} updated successfully`});

};


const updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  console.log(oldPassword, newPassword)
  if (!oldPassword || !newPassword) {
    throw new BadRequestError('Please provide both values');
  }
  const user = await User.findOne({ _id: req.user.userId });
  console.log(user)

  // const isPasswordCorrect = await user.comparePassword(oldPassword);
  // if (!isPasswordCorrect) {
  //   throw new UnauthenticatedError('Invalid Credentials');
  // }
  user.password = newPassword;

  await user.save();
  res.status(StatusCodes.OK).json({ msg: 'Success! Password Updated.' });
};

module.exports = {
    updateUser,
    updatePassword
}