import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";

const MAX_PAYLOAD_BYTES = 1024 * 1024;

function encodeFrame(payload, opcode = 0x1) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  let header;

  if (body.length < 126) {
    header = Buffer.from([0x80 | opcode, body.length]);
  } else if (body.length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(body.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(body.length), 2);
  }

  return Buffer.concat([header, body]);
}

export class WebSocketPeer extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.isOpen = true;

    socket.on("data", (chunk) => this.handleData(chunk));
    socket.on("close", () => this.handleClose());
    socket.on("error", (error) => this.emit("error", error));
  }

  send(value) {
    if (!this.isOpen) {
      return;
    }
    this.socket.write(encodeFrame(String(value)));
  }

  close() {
    if (!this.isOpen) {
      return;
    }
    this.socket.write(encodeFrame(Buffer.alloc(0), 0x8));
    this.socket.end();
    this.handleClose();
  }

  handleClose() {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    this.emit("close");
  }

  handleData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const opcode = first & 0x0f;
      const masked = Boolean(second & 0x80);
      let payloadLength = second & 0x7f;
      let offset = 2;

      if (payloadLength === 126) {
        if (this.buffer.length < 4) return;
        payloadLength = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (this.buffer.length < 10) return;
        const largeLength = this.buffer.readBigUInt64BE(2);
        if (largeLength > BigInt(MAX_PAYLOAD_BYTES)) {
          this.close();
          return;
        }
        payloadLength = Number(largeLength);
        offset = 10;
      }

      if (payloadLength > MAX_PAYLOAD_BYTES) {
        this.close();
        return;
      }

      const maskBytes = masked ? 4 : 0;
      const frameLength = offset + maskBytes + payloadLength;
      if (this.buffer.length < frameLength) return;

      let payload = this.buffer.subarray(offset + maskBytes, frameLength);
      if (masked) {
        const mask = this.buffer.subarray(offset, offset + 4);
        payload = Buffer.from(payload);
        for (let index = 0; index < payload.length; index += 1) {
          payload[index] ^= mask[index % 4];
        }
      }
      this.buffer = this.buffer.subarray(frameLength);

      if (opcode === 0x8) {
        this.close();
        return;
      }
      if (opcode === 0x9) {
        this.socket.write(encodeFrame(payload, 0x0a));
        continue;
      }
      if (opcode === 0x1) {
        this.emit("message", payload.toString("utf8"));
      }
    }
  }
}

export function attachWebSocketServer(httpServer, onConnection) {
  httpServer.on("upgrade", (request, socket) => {
    const key = request.headers["sec-websocket-key"];
    const upgrade = request.headers.upgrade?.toLowerCase();

    if (!key || upgrade !== "websocket") {
      socket.destroy();
      return;
    }

    const accept = createHash("sha1")
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest("base64");
    socket.write(
      [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${accept}`,
        "\r\n",
      ].join("\r\n"),
    );
    onConnection(new WebSocketPeer(socket), request);
  });
}
