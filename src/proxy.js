"use strict";
const undici = require("undici");
const pick = require("lodash").pick;
const { generateRandomIP, randomUserAgent } = require('./utils');
const shouldCompress = require("./shouldCompress");
const redirect = require("./redirect");
const compress = require("./compress");
const copyHeaders = require("./copyHeaders");

const viaHeaders = [
  '1.1 example-proxy-service.com (ExampleProxy/1.0)',
  '1.0 another-proxy.net (Proxy/2.0)',
  '1.1 different-proxy-system.org (DifferentProxy/3.1)',
  '1.1 some-proxy.com (GenericProxy/4.0)',
];

function randomVia() {
  const index = Math.floor(Math.random() * viaHeaders.length);
  return viaHeaders[index];
}

async function proxy(request, reply) {

  const DEFAULT_QUALITY = 40;

  let url = request.query.url;
  if (!url) { 
    const ipAddress = generateRandomIP();
    const ua = randomUserAgent();
    const hdrs = {
      ...pick(request.headers, ["cookie", "dnt", "referer", "range"]),
      'user-agent': ua,
      'x-forwarded-for': ipAddress,
      'via': randomVia(),
    };

    Object.entries(hdrs).forEach(([key, value]) => reply.header(key, value));

    return reply.send('1we23');
  }

  request.params.url = decodeURIComponent(url);
  request.params.webp = !request.query.jpeg;
  request.params.grayscale = request.query.bw != 0;
  request.params.quality = parseInt(request.query.l, 10) || DEFAULT_QUALITY;

  const randomIP = generateRandomIP();
  const userAgent = randomUserAgent();

  try {
    let origin = await undici.request(request.params.url, {
      headers: {
        ...pick(request.headers, ["cookie", "dnt", "referer", "range"]),
        'user-agent': userAgent,
        'x-forwarded-for': randomIP,
        'via': randomVia(),
      },
      timeout: 10000,
      maxRedirections: 4
    });
    _onRequestResponse(origin, request, reply);
  } catch (err) {
    _onRequestError(request, reply, err);
  }
}

function _onRequestError(request, reply, err) {
  if (err.code === "ERR_INVALID_URL") return reply.status(400).send("Invalid URL");

  redirect(request, reply);
  console.error(err);
}

function _onRequestResponse(origin, request, reply) {
  if (origin.statusCode >= 400)
    return redirect(request, reply);

  if (origin.statusCode >= 300 && origin.headers.location)
    return redirect(request, reply);

  copyHeaders(origin, reply);
  reply
    .header("content-encoding", "identity")
    .header("Access-Control-Allow-Origin", "*")
    .header("Cross-Origin-Resource-Policy", "cross-origin")
    .header("Cross-Origin-Embedder-Policy", "unsafe-none");
    
  request.params.originType = origin.headers["content-type"] || "";
  request.params.originSize = origin.headers["content-length"] || "0";

  origin.body.on('error', _ => request.raw.destroy());

  if (shouldCompress(request)) {
    return compress(request, reply, origin);
  } else {
    reply.header("x-proxy-bypass", 1);

    for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
      if (headerName in origin.headers)
        reply.header(headerName, origin.headers[headerName]);
    }

    return origin.body.pipe(reply.raw);
  }
}

module.exports = proxy;
