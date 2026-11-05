// Site settings.
const LIVE_API = 'https://xmanr5qvdd.execute-api.us-east-1.amazonaws.com';
const sameOriginAsApi = typeof location !== 'undefined' && location.origin === LIVE_API;

export const CONFIG = {
  // Leave empty to keep requests on the buyer's device (prototype mode), or set an HTTPS endpoint
  // that accepts a JSON POST to forward requests to a CRM.
  requestEndpoint: '',
  // Sami's "Live AI" mode. The Buzzar API only answers same-origin requests, so this switches on
  // automatically when the site is served from the API's own domain. Point it at a proxy to use it elsewhere.
  advisorEndpoint: sameOriginAsApi ? '/api/advisor/match' : '',
  liveApi: LIVE_API,
};
