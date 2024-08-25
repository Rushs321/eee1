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

async function proxy(req, reply) {

  const DEFAULT_QUALITY = 40;

  let url = req.query.url;
  if (!url){ 
      const ipAddress = generateRandomIP();
      const ua = randomUserAgent();
      const hdrs = {
          ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
          'user-agent': ua,
          'x-forwarded-for': ipAddress,
          'via': randomVia(),
      };
          
      Object.entries(hdrs).forEach(([key, value]) => reply.header(key, value));
      
      return reply.send('1we23');
  }

  req.params.url = decodeURIComponent(url);
  req.params.webp = !req.query.jpeg;
  req.params.grayscale = req.query.bw != 0;
  req.params.quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY;

  const randomIP = generateRandomIP();
  const userAgent = randomUserAgent();

  try {
    let origin = await undici.request(req.params.url, {
      headers: {
        ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
        'user-agent': userAgent,
        'x-forwarded-for': randomIP,
        'via': randomVia(),
      },
      timeout: 10000,
      maxRedirections: 4
    });
    _onRequestResponse(origin, req, reply);
  } catch (err) {
    _onRequestError(req, reply, err);
  }
}

function _onRequestError(req, reply, err) {
  if (err.code === "ERR_INVALID_URL") return reply.status(400).send("Invalid URL");

  redirect(req, reply);
  console.error(err);
}

function _onRequestResponse(origin, req, reply) {
  if (origin.statusCode >= 400)
    return redirect(req, reply);

  if (origin.statusCode >= 300 && origin.headers.location)
    return redirect(req, reply);

  copyHeaders(origin, reply);
  reply.header("content-encoding", "identity");
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Cross-Origin-Resource-Policy", "cross-origin");
  reply.header("Cross-Origin-Embedder-Policy", "unsafe-none");
  req.params.originType = origin.headers["content-type"] || "";
  req.params.originSize = origin.headers["content-length"] || "0";

  origin.body.on('error', (err) => {
    req.log.error('Stream error:', err);
    req.destroy();
  });

  if (shouldCompress(req)) {
    return compress(req, reply, origin);
  } else {
    reply.header("x-proxy-bypass", 1);

    for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
      if (headerName in origin.headers)
        reply.header(headerName, origin.headers[headerName]);
    }

    origin.body.pipe(reply.raw).on('error', (err) => {
      req.log.error('Pipe error:', err);
      req.destroy();
    });
  }
}

module.exports = proxy;
