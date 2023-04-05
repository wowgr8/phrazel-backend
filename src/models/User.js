const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  username: {
    type: String, 
    required: [true, 'Please provide username'],
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String, 
    trim: true,
    unique: true,
  },
  password:{
    type:String,
    required:[true, 'Please provide password'],
    minlength: 5,
  },
})

UserSchema.pre('save', async function() {

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password,salt)
})

UserSchema.methods.createJWT = function () {
  return jwt.sign({userId:this._id,username:this.username},process.env.JWT_SECRET,{
    expiresIn:process.env.JWT_LIFETIME,
  })
}

UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password)
  return isMatch
}

module.exports = mongoose.model('User', UserSchema)
