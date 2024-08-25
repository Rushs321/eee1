#!/usr/bin/env node
'use strict';

const fastify = require('fastify')();
const proxy = require('./src/proxy');



const PORT = process.env.PORT || 8080;

// Set up the route
app.get('/', async (req, reply) => {
  return proxy(req, reply);
});

// Start the server
const start = async () => {
  try {
    await app.listen({ host: '0.0.0.0', port: PORT });
    console.log(`Listening on ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
