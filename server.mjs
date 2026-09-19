import { createServer } from "node:http";

const port = Number(process.env.PORT || 3000);

createServer((req, res) => {
  res.writeHead(200, {"content-type":"text/plain; charset=utf-8"});
  res.end("Open Inquiry UI");
}).listen(port, () => {
  console.log(`Open Inquiry UI: http://localhost:${port}`);
});
