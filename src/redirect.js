"use strict";
function redirect(request, reply) {
  if (reply.raw.headersSent) return;

  reply
    .status(302)
    .header('content-length', 0)
    .header('location', encodeURI(request.query.url))
    .send();
}

module.exports = redirect;
