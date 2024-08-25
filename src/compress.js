"use strict";
const sharp = require('sharp');
const redirect = require('./redirect');

const sharpStream = _ => sharp({ animated: !process.env.NO_ANIMATE, unlimited: true });

function compress(request, reply, input) {
  const format = request.params.webp ? 'webp' : 'jpeg';

  input.body.pipe(sharpStream()
    .grayscale(request.params.grayscale)
    .toFormat(format, {
      quality: request.params.quality,
      progressive: true,
      optimizeScans: true
    })
    .toBuffer((err, output, info) => _sendResponse(err, output, info, format, request, reply)));
}

function _sendResponse(err, output, info, format, request, reply) {
  if (err || !info) return redirect(request, reply);

  reply
    .header('content-type', 'image/' + format)
    .header('content-length', info.size)
    .header('x-original-size', request.params.originSize)
    .header('x-bytes-saved', request.params.originSize - info.size)
    .status(200)
    .send(output);
}

module.exports = compress;
