var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');
const methodOverride = require('method-override');
require("dotenv").config();
const mongoose = require("mongoose");
const Auth = require("./model/Auth");

var indexRouter = require('./routes/index');
var authRoute = require('./routes/authRoute');
var memoryRoute = require('./routes/memoryRoute');

var app = express();
const connect = mongoose.connect(process.env.MONGO_URI);
connect.then(async () => {
  console.log("Connected correctly to server");

  // Đồng bộ 2 tài khoản mặc định cho model Auth
  try {
    await Auth.syncDefaultUsers();
    console.log("Synced default Auth users (2 tài khoản mặc định).");
  } catch (err) {
    console.error("Error syncing default Auth users:", err);
  }
});

const corsOptions = {
  origin: 'http://localhost:5173', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(methodOverride('_method'));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Swagger setup
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Memory API',
      version: '1.0.0',
      description: 'API documentation for memory project',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Local server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: [path.join(__dirname, 'routes', '*.js')],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.use('/', indexRouter);
app.use('/auth', authRoute);
app.use('/memories', memoryRoute);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  const status = err.status || 500;
  if (req.originalUrl.startsWith('/api-docs')) {
    // Let swagger-ui handle its own errors
    return next(err);
  }
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    status,
  });
});

module.exports = app;
