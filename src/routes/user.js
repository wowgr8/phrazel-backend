const express = require('express')
const router = express.Router()

const { getUser,
        updateUser
        } = require('../controllers/user')

    router.route('/user/:id').get(getUser).patch(updateUser)

    module.exports = router