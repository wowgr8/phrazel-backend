
const mainController = {};

mainController.get = (req, res) => {
    return res.json({
        data: 'Api is running!'
    });
};

module.exports = mainController;