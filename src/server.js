const app = require("./app");
require('dotenv').config();
require('express-async-errors');
const session = require('express-session');
const MongoDBStore = require("connect-mongodb-session")(session);
const connectDB = require('./db/connect');

/* routers */
const authRouter = require('./routes/auth');
const mainRouter = require('./routes/mainRouter.js');
app.use('/api/v1/auth', authRouter)
app.use('/api/v1', mainRouter);

/* middleware */
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

/* database connection */
const url = process.env.MONGO_URI;
const store = new MongoDBStore({
  // may throw an error, which won't be caught
  uri: url,
  collection: "testing",
});
store.on("error", function (error) {
  console.log(error);
});

/* connect to localhost://8000  */
const port = process.env.PORT || 8000;
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () =>
      console.log(`server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();