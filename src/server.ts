import mongoose from 'mongoose';
import config from './config';
import app from './app';
import { initializeSocket } from './socket/socketconn';

import { Server as HTTPServer } from 'http';
import seedingAdmin from './utilities/seeding';

let server: HTTPServer;

// handle uncaught exception error
process.on('uncaughtException', (error) => {
  console.log('uncaughtException error', error);
  process.exit(1);
});


const runServer = async () => {
  
  await mongoose.connect(config.mongodb_url as string);
  console.log('\x1b[36mDatabase connection successfull\x1b[0m');

  server = app.listen(config.server_port || 5002, config.base_url as string, () => {
    console.log(`\x1b[32mServer is listening on port http://${config.base_url}:${config.server_port || 5020}\x1b[0m`);
  });
  
   seedingAdmin()
  // initialize socket after server is created
  initializeSocket(server);
};

// handle unhandled rejection
process.on('unhandledRejection', (reason, promise) => {
  console.log(`unhandle rejection at ${promise} and reason ${reason}`);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// gracefull shoutdown on SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received.');
  server.close(() => {
    console.log('Server closed.');
  });
});

runServer();
