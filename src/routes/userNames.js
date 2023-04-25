const express = require('express')
const router = express.Router()

const { getUserNames } = require('../controllers/userNames')

    router.route('/userNames').get(getUserNames)

    module.exports = router