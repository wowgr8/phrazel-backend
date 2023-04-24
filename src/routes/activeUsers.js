const express = require('express');
const router = express.Router();
const activeUsers = require('../controllers/activeUsers.js');

router.get('/active-users', activeUsers.get);
  
module.exports = router;