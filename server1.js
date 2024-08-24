#!/usr/bin/env node
'use strict'
const cluster = require("cluster");
const os = require("os");

if (cluster.isPrimary) {
  const numClusters = process.env.CLUSTERS || (os.availableParallelism ? os.availableParallelism() : (os.cpus().length || 2))

  console.log(`Primary ${process.pid} is running. Will fork ${numClusters} clusters.`);

  // Fork workers.
  for (let i = 0; i < numClusters; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Forking another one....`);
    cluster.fork();
  });

  return true;
}
const fastify = require('fastify')();
const express = require('@fastify/express');
const proxy = require('./src/proxy');

const PORT = process.env.PORT || 3000;

async function start() {
  // Register the express plugin
  await fastify.register(express);

  // Use Express middleware for handling the proxy
  fastify.use('/', (req, res, next) => {
    if (req.path === '/') {
      return proxy(req, res);
    }
    next();
  });

  
  /* Handle favicon.ico separately
  fastify.use('/favicon.ico', (req, res) => {
    res.status(204).end();
  });*/

  // Start the server
  fastify.listen({host: '0.0.0.0' , port: PORT }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
});
}

start();
