const createTokenUser = (user) => {
  return { username: user.username, userId: user._id};
};

module.exports = createTokenUser;