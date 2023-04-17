/* module setup */
require('dotenv').config();
const express = require('express')
require('express-async-errors');
const session = require('express-session');
const MongoDBStore = require("connect-mongodb-session")(session);
const connectDB = require('./db/connect');
const app = express()

/** extra security packages */
const cors = require('cors')
const favicon = require('express-favicon');
const logger = require('morgan')

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(logger('dev'));
app.use(express.static('public'))
app.use(favicon(__dirname + '/public/favicon.ico'));

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
  collection: "sessions",
});
store.on("error", function (error) {
  console.log(error);
});

/* session set-up - proxies and cookies*/
const session_parms = {
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false, sameSite: "strict" },
};
if (app.get("env") === "production") {
  //SECURITY
  app.set("trust proxy", 1);
  session_parms.cookie.secure = true;
}
app.use(session(session_parms));

/* connect to localhost://8000  */
const port = process.env.PORT || 8000;
const start = async () => {
  try {
    await connectDB(url);
    app.listen(port, () =>
      console.log(`server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();