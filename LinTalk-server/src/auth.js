const { parseToken } = require('./utils/jwt');
const { tokenInvalid, loginElsewhere } = require('./utils/response');
const { getSessionTokenByUserId } = require('./session-store');

const permitUrls = new Set([
  '/api/v1/login/verify',
  '/api/v1/login/public-key',
  '/api/v1/login',
  '/ws'
]);

async function authMiddleware(req, res, next) {
  const token = req.header('x-token');
  const url = req.path;

  if (req.method.toUpperCase() === 'OPTIONS') {
    return next();
  }

  if (permitUrls.has(url)) {
    if (token) {
      try {
        req.user = parseToken(token);
      } catch {
      }
    }
    return next();
  }

  if (!token) {
    return res.json(tokenInvalid());
  }

  let claims;
  try {
    claims = parseToken(token);
  } catch {
    return res.json(tokenInvalid());
  }

  const userId = claims.userId;
  const cacheToken = await getSessionTokenByUserId(userId);
  if (!cacheToken) {
    return res.json(tokenInvalid());
  }

  if (cacheToken !== token) {
    return res.json(loginElsewhere());
  }

  req.user = claims;
  return next();
}

module.exports = {
  authMiddleware
};
