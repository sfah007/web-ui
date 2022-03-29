"use strict";

const jwt = require('jsonwebtoken');

const {
  roleToTier
} = require('./roles');

function generateToken(req, expire, secret) {
  let role = null;

  if (req.user && req.user.role) {
    role = req.user.role;
  }

  const start = new Date();
  let ip = null;

  if (req.headers['cf-connecting-ip'] != undefined) {
    ip = req.headers['cf-connecting-ip'];
  } else if (req.headers['x-forwarded-for'] != undefined) {
    ip = req.headers['x-forwarded-for'];
  } else {
    ip = req.connection.remoteAddress;
  }

  ip = ip.split(',')[0];
  const data = Object.assign({
    agent: req.headers['user-agent'],
    remoteAddress: ip,
    domain: req.refDomain,
    exp: Math.floor(start.getTime() / 1000) + expire,
    sessionID: req.sessionID,
    ads: req.ads
  }, roleToTier(role));
  return jwt.sign(data, secret, {
    noTimestamp: true
  });
}

module.exports = function (config, app) {
  const tokenExpire = 24 * 60 * 60 * 7;
  const secret = config.secret !== undefined ? config.secret : '23725e7487cb708468819ca3199d35a9';
  app.get('/token', (req, res) => {
    try {
      const data = jwt.verify(req.headers.token, secret);
      const start = new Date();
      data.exp = Math.floor(start.getTime() / 1000) + tokenExpire;
      res.setHeader('Cache-Control', 'no-store');
      res.send(jwt.sign(data, secret, {
        noTimestamp: true
      }));
    } catch (e) {
      console.log(e);
      res.send(403);
    }
  });
  app.use((req, res, next) => {
    const t = generateToken(req, tokenExpire, secret);
    req.token = t;
    next();
  });
};