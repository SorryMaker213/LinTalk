const jwt = require('jsonwebtoken');
const config = require('../config');

function createToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function parseToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = {
  createToken,
  parseToken
};
