const express = require('express');
const app = express();
try {
  app.get("*", (req, res) => res.send("ok"));
  console.log("'*' works!");
} catch (e) {
  console.log("'*' failed", e.message);
}
try {
  app.use((req, res) => res.send("ok"));
  console.log("'app.use' works!");
} catch (e) {
  console.log("'app.use' failed", e.message);
}
