"use strict";

const Fastify = require('fastify');
const proxy = require('./src/proxy'); // Directly referencing the relative path

// Initialize Fastify
const fastify = Fastify({ logger: true });

// Register the proxy route
fastify.get('/proxy', proxy);

// Start the server
fastify.listen(3000, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server listening at ${address}`);
});
