const express = require('express');
const app = express();
app.get("*all", (req, res) => {
  res.send("Matched " + req.path);
});
const server = app.listen(12346, () => {
  console.log("Listening");
  const http = require('http');
  http.get('http://localhost:12346/', (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
      console.log("Response:", data);
      process.exit(0);
    });
  });
});
