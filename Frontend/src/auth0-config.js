export const auth0Config = {
  domain: 'dev-0kv8jx80vde2rw2u.us.auth0.com',
  clientId: 'kutilVQYYCOOreeyCDh9PfNzKi5QmoXD',
  audience: 'https://dev-0kv8jx80vde2rw2u.us.auth0.com/api/v2/',
  scope: 'openid profile email offline_access',
  responseType: 'token id_token',
  redirectUri: window.location.origin,
  useRefreshTokens: true,
  cacheLocation: 'localstorage'
};