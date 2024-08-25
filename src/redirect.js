"use strict";
function redirect(req, reply) {
  if (reply.sent) return;

  reply
    .header('content-length', 0)
    .removeHeader('cache-control')
    .removeHeader('expires')
    .removeHeader('date')
    .removeHeader('etag')
    .header('location', encodeURI(req.params.url))
    .status(302)
    .send();
}

module.exports = redirect;
