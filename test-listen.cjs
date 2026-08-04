const http = require('http');
const server = http.createServer();
server.listen("8080", "0.0.0.0", () => {
  console.log("Listening on", server.address());
  process.exit(0);
});
