
const activeUsers = {}
const {activeUsersApp} = require('../app')
console.log(activeUsersApp,'active users app');
activeUsers.get = (req, res) => {
    return res.json({
        data: activeUsersApp
    });
};

module.exports = activeUsers;