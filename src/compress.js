"use strict";
const sharp = require('sharp');
const redirect = require('./redirect');

const sharpStream = () => sharp({ animated: !process.env.NO_ANIMATE, unlimited: true });

async function compress(request, reply, input) {
  const format = request.query.webp ? 'webp' : 'jpeg';
  const quality = parseInt(request.query.l, 10) || 40;

  try {
    const { data: output, info } = await sharpStream()
      .grayscale(request.query.grayscale)
      .toFormat(format, {
        quality,
        progressive: true,
        optimizeScans: true
      })
      .toBuffer();

    reply
      .type(`image/${format}`)
      .header('x-original-size', request.query.originSize)
      .header('x-bytes-saved', request.query.originSize - info.size)
      .send(output);
  } catch (err) {
    redirect(request, reply);
  }
}

module.exports = compress;
