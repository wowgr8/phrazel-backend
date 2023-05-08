
const express = require('express')
const router = express.Router()

const {
  getUser,
  updateUser,
  updatePassword,
} = require('../controllers/user');

router.route('/updatePassword/:id').patch(updatePassword);
router.route('/:id').get(getUser).patch(updateUser)



module.exports = router