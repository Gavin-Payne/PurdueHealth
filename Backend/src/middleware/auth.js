const { auth } = require('express-oauth2-jwt-bearer');
const fetch = require('node-fetch');
const cache = new Map();

const checkJwt = auth({
  audience: 'https://dev-0kv8jx80vde2rw2u.us.auth0.com/api/v2/',
  issuerBaseURL: 'https://dev-0kv8jx80vde2rw2u.us.auth0.com/',
  tokenSigningAlg: 'RS256'
});

const extractUserFromToken = async (req) => {
  try {
    const payload = req.auth?.payload;
    console.log('Full token payload:', payload);

    // First try to get data from payload
    if (payload?.email) {
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0]
      };
    }

    // Check cache before making API call
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const cacheKey = payload?.sub;
    if (cacheKey && cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    // Implement exponential backoff for rate limits
    const maxRetries = 3;
    let delay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch('https://dev-0kv8jx80vde2rw2u.us.auth0.com/userinfo', {
          headers: {
            'Authorization': authHeader
          },
          timeout: 5000
        });

        if (response.status === 429) {
          console.log(`Rate limited, attempt ${attempt + 1}, waiting ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        if (!response.ok) {
          console.error('Auth0 userinfo error:', {
            status: response.status,
            statusText: response.statusText
          });
          throw new Error(`Auth0 userinfo failed: ${response.status}`);
        }

        const userInfo = await response.json();
        console.log('User info from Auth0:', userInfo);

        if (!userInfo.email) {
          throw new Error('No email in userinfo response');
        }

        const userData = {
          id: payload.sub,
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split('@')[0],
          picture: userInfo.picture
        };

        // Cache the user data
        if (cacheKey) {
          cache.set(cacheKey, userData);
          // Expire cache after 5 minutes
          setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);
        }

        return userData;
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
      }
    }

  } catch (error) {
    console.error('Token extraction error:', error);
    throw error;
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