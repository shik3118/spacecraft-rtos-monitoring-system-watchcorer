'use strict';

const logger = require('../logging/runtimeLogger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled route error', {
    path: req.path,
    message: err.message,
    details: err.details
  });

  res.status(500).json({
    error: 'internal_server_error',
    message: err.message
  });
}

module.exports = {
  errorHandler
};
