"use strict";

const Fastify = require('fastify');
const proxy = require('./src/proxy'); // Directly referencing the relative path

// Initialize Fastify
const fastify = Fastify({ logger: true });

// Register the proxy route
fastify.get('/proxy', proxy);

// Start the server
fastify.listen({host: '0.0.0.0' , port: PORT }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
});
