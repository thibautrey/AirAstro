import { exec as execCallback } from "child_process";
import { promisify } from "util";

const exec = promisify(execCallback);

export class IndiClient {
  constructor(private host: string = "localhost", private port: number = 7624) {}

  async getProp(prop: string): Promise<string> {
    try {
      const { stdout } = await exec(
        `indi_getprop -h ${this.host} -p ${this.port} ${prop}`
      );
      return stdout.trim();
    } catch {
      return "";
    }
  }

  async setProp(prop: string, value: string): Promise<void> {
    await exec(
      `indi_setprop -h ${this.host} -p ${this.port} ${prop}=${value}`
    );
  }
}
