import EventEmitter from "node:events";
import { Worker } from "node:worker_threads";
import type { InitOptions, InputMessage, OutputMessage } from "./worker.js";

export default class AsciidocConverter extends EventEmitter {
  private worker;

  constructor(opts?: InitOptions) {
    super({ captureRejections: true });
    const url = new URL("./worker.cjs", import.meta.url);
    this.worker = new Worker(url, {
      workerData: opts,
    });
    this.worker.on("exit", (code) => {
      this.emit("exit", { code });
    });
  }

  async convert(input: InputMessage): Promise<OutputMessage> {
    return new Promise((resolve, reject) => {
      this.worker
        .removeAllListeners("message")
        .removeAllListeners("error")
        .on("message", resolve)
        .on("error", reject)
        .postMessage(input);
    });
  }

  async terminate() {
    return this.worker.terminate();
  }
}
