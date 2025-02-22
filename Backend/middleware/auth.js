const { auth } = require('express-oauth2-jwt-bearer');
const fetch = require('node-fetch');

const checkJwt = auth({
  audience: 'https://dev-0kv8jx80vde2rw2u.us.auth0.com/api/v2/',
  issuerBaseURL: 'https://dev-0kv8jx80vde2rw2u.us.auth0.com/',
  tokenSigningAlg: 'RS256'
});

const extractUserFromToken = async (req) => {
  try {
    const payload = req.auth?.payload;
    console.log('Full token payload:', payload);

    // If email is not in token, fetch from userinfo endpoint
    if (!payload?.email) {
      const response = await fetch('https://dev-0kv8jx80vde2rw2u.us.auth0.com/userinfo', {
        headers: {
          'Authorization': req.headers.authorization
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userInfo = await response.json();
      console.log('User info from Auth0:', userInfo);

      return {
        id: payload?.sub,
        email: userInfo.email,
        name: userInfo.name
      };
    }

    return {
      id: payload?.sub,
      email: payload?.email,
      name: payload?.name
    };
  } catch (error) {
    console.error('Token extraction error:', error);
    return null;
  }
};

const requireEmail = async (req, res, next) => {
  try {
    const user = await extractUserFromToken(req);
    
    if (!user?.email) {
      return res.status(401).json({
        message: 'Authentication failed - no email found',
        details: 'Email not found in token or userinfo'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Email requirement check failed:', error);
    res.status(401).json({
      message: 'Authentication failed',
      error: error.message
    });
  }
};

const handlePreflightRequest = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Email');
    res.status(200).end();
    return;
  }
  next();
};

module.exports = { 
  checkJwt, 
  extractUserFromToken, 
  requireEmail,
  handlePreflightRequest 
};