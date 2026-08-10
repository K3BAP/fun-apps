import { createServer } from "node:http";
import { createApp } from "./app";
import { attachRooms } from "./rooms/socket";
import { startSweeper } from "./rooms/store";

const port = Number(process.env.PORT ?? 3000);

const server = createServer(createApp());
attachRooms(server);
startSweeper();

server.listen(port, () => {
  console.log(`fun-apps hört auf Port ${port}`);
});
