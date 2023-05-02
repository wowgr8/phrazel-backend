const express = require('express')
const router = express.Router()

const {
  updateUser,
  updatePassword,
} = require('../controllers/user');


router.route('/updateUser').patch(updateUser);
router.route('/updatePassword').patch(updatePassword);



module.exports = router