const express = require('express')
const router = express.Router()

const { getGames,
        updateGames
        } = require('../controllers/games')

    router.route('/games/:id').get(getGames).patch(updateGames)

    module.exports = router