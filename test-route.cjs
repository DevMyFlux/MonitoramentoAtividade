const express = require('express');
const app = express();
try {
  app.use("*", (req, res) => res.send("ok"));
  console.log("'use(*)' works!");
} catch (e) {
  console.log("'use(*)' failed", e.message);
}
