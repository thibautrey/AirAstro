import { IndiClient, IndiProperty } from "./indi-client";

export abstract class IndiDevice {
  protected client: IndiClient;
  protected deviceName: string;

  constructor(client: IndiClient, deviceName: string) {
    this.client = client;
    this.deviceName = deviceName;
  }

  protected async waitForProperty(
    propertyName: string,
    timeout: number = 5000
  ): Promise<IndiProperty> {
    return new Promise((resolve, reject) => {
      const checkProperty = () => {
        const prop = this.client.getProperty(this.deviceName, propertyName);
        if (prop) {
          resolve(prop);
        }
      };

      // Check immediately
      checkProperty();

      const timer = setTimeout(() => {
        this.client.removeListener("propertyDefined", listener);
        reject(
          new Error(
            `Timeout waiting for property ${propertyName} on device ${this.deviceName}`
          )
        );
      }, timeout);

      const listener = (device: string, property: string) => {
        if (device === this.deviceName && property === propertyName) {
          clearTimeout(timer);
          this.client.removeListener("propertyDefined", listener);
          checkProperty();
        }
      };

      this.client.on("propertyDefined", listener);
    });
  }

  protected async waitForState(
    propertyName: string,
    state: "Ok" | "Idle",
    timeout: number = 30000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkState = () => {
        const prop = this.client.getProperty(this.deviceName, propertyName);
        if (prop && prop.state === state) {
          resolve();
        }
      };

      // Check immediately
      checkState();

      const timer = setTimeout(() => {
        this.client.removeListener("propertyUpdated", listener);
        reject(
          new Error(
            `Timeout waiting for property ${propertyName} to reach state ${state}`
          )
        );
      }, timeout);

      const listener = (device: string, property: string) => {
        if (device === this.deviceName && property === propertyName) {
          const prop = this.client.getProperty(this.deviceName, propertyName);
          if (prop?.state === state) {
            clearTimeout(timer);
            this.client.removeListener("propertyUpdated", listener);
            resolve();
          } else if (prop?.state === "Alert") {
            clearTimeout(timer);
            this.client.removeListener("propertyUpdated", listener);
            reject(new Error(`Property ${propertyName} reached Alert state`));
          }
        }
      };

      this.client.on("propertyUpdated", listener);
    });
  }

  async isConnected(): Promise<boolean> {
    const prop = this.client.getProperty(this.deviceName, "CONNECTION");
    return prop?.elements.get("CONNECT")?.value === "On";
  }

  async connect(): Promise<void> {
    await this.client.setProp(this.deviceName, "CONNECTION", { CONNECT: "On" });
    await this.waitForState("CONNECTION", "Ok");
  }

  async disconnect(): Promise<void> {
    await this.client.setProp(this.deviceName, "CONNECTION", {
      DISCONNECT: "On",
    });
    await this.waitForState("CONNECTION", "Ok");
  }
}

export class IndiCamera extends IndiDevice {
  async startExposure(duration: number): Promise<void> {
    await this.waitForProperty("CCD_EXPOSURE");
    await this.client.setProp(this.deviceName, "CCD_EXPOSURE", {
      CCD_EXPOSURE_VALUE: duration.toString(),
    });
    await this.waitForState("CCD_EXPOSURE", "Ok");
  }

  async abortExposure(): Promise<void> {
    await this.client.setProp(this.deviceName, "CCD_ABORT_EXPOSURE", {
      ABORT: "On",
    });
    await this.waitForState("CCD_ABORT_EXPOSURE", "Ok");
  }

  async getTemperature(): Promise<number> {
    const prop = this.client.getProperty(this.deviceName, "CCD_TEMPERATURE");
    const tempValue = prop?.elements.get("CCD_TEMPERATURE_VALUE")?.value;
    return tempValue ? parseFloat(tempValue) : 0;
  }

  async setTemperature(temperature: number): Promise<void> {
    await this.client.setProp(this.deviceName, "CCD_TEMPERATURE", {
      CCD_TEMPERATURE_VALUE: temperature.toString(),
    });
  }

  async enableCooling(): Promise<void> {
    await this.client.setProp(this.deviceName, "CCD_COOLER", {
      COOLER_ON: "On",
    });
    await this.waitForState("CCD_COOLER", "Ok");
  }

  async disableCooling(): Promise<void> {
    await this.client.setProp(this.deviceName, "CCD_COOLER", {
      COOLER_OFF: "On",
    });
    await this.waitForState("CCD_COOLER", "Ok");
  }

  async setBinning(x: number, y: number): Promise<void> {
    await this.client.setProp(this.deviceName, "CCD_BINNING", {
      HOR_BIN: x.toString(),
      VER_BIN: y.toString(),
    });
    await this.waitForState("CCD_BINNING", "Ok");
  }

  async setROI(
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    await this.client.setProp(this.deviceName, "CCD_FRAME", {
      X: x.toString(),
      Y: y.toString(),
      WIDTH: width.toString(),
      HEIGHT: height.toString(),
    });
    await this.waitForState("CCD_FRAME", "Ok");
  }

  async enableBLOB(): Promise<void> {
    await this.client.enableBLOB(this.deviceName, "CCD1", "Also");
  }
}

export class IndiMount extends IndiDevice {
  async slewToCoord(ra: number, dec: number): Promise<void> {
    await this.client.setProp(this.deviceName, "EQUATORIAL_EOD_COORD", {
      RA: ra.toString(),
      DEC: dec.toString(),
    });
    await this.waitForState("EQUATORIAL_EOD_COORD", "Ok");
  }

  async sync(ra: number, dec: number): Promise<void> {
    await this.client.setProp(this.deviceName, "ON_COORD_SET", { SYNC: "On" });
    await this.client.setProp(this.deviceName, "EQUATORIAL_EOD_COORD", {
      RA: ra.toString(),
      DEC: dec.toString(),
    });
    await this.waitForState("EQUATORIAL_EOD_COORD", "Ok");
  }

  async startTracking(): Promise<void> {
    await this.client.setProp(this.deviceName, "TELESCOPE_TRACK_STATE", {
      TRACK_ON: "On",
    });
    await this.waitForState("TELESCOPE_TRACK_STATE", "Ok");
  }

  async stopTracking(): Promise<void> {
    await this.client.setProp(this.deviceName, "TELESCOPE_TRACK_STATE", {
      TRACK_OFF: "On",
    });
    await this.waitForState("TELESCOPE_TRACK_STATE", "Ok");
  }

  async park(): Promise<void> {
    await this.client.setProp(this.deviceName, "TELESCOPE_PARK", {
      PARK: "On",
    });
    await this.waitForState("TELESCOPE_PARK", "Ok");
  }

  async unpark(): Promise<void> {
    await this.client.setProp(this.deviceName, "TELESCOPE_PARK", {
      UNPARK: "On",
    });
    await this.waitForState("TELESCOPE_PARK", "Ok");
  }

  async getCurrentPosition(): Promise<{ ra: number; dec: number }> {
    const prop = this.client.getProperty(
      this.deviceName,
      "EQUATORIAL_EOD_COORD"
    );
    const ra = parseFloat(prop?.elements.get("RA")?.value || "0");
    const dec = parseFloat(prop?.elements.get("DEC")?.value || "0");
    return { ra, dec };
  }
}

export class IndiFocuser extends IndiDevice {
  async moveAbsolute(position: number): Promise<void> {
    await this.client.setProp(this.deviceName, "ABS_FOCUS_POSITION", {
      FOCUS_ABSOLUTE_POSITION: position.toString(),
    });
    await this.waitForState("ABS_FOCUS_POSITION", "Ok");
  }

  async moveRelative(steps: number): Promise<void> {
    await this.client.setProp(this.deviceName, "REL_FOCUS_POSITION", {
      FOCUS_RELATIVE_POSITION: Math.abs(steps).toString(),
    });

    if (steps > 0) {
      await this.client.setProp(this.deviceName, "FOCUS_MOTION", {
        FOCUS_OUTWARD: "On",
      });
    } else {
      await this.client.setProp(this.deviceName, "FOCUS_MOTION", {
        FOCUS_INWARD: "On",
      });
    }

    await this.waitForState("REL_FOCUS_POSITION", "Ok");
  }

  async abort(): Promise<void> {
    await this.client.setProp(this.deviceName, "FOCUS_ABORT_MOTION", {
      ABORT: "On",
    });
    await this.waitForState("FOCUS_ABORT_MOTION", "Ok");
  }

  async getCurrentPosition(): Promise<number> {
    const prop = this.client.getProperty(this.deviceName, "ABS_FOCUS_POSITION");
    const position = prop?.elements.get("FOCUS_ABSOLUTE_POSITION")?.value;
    return position ? parseInt(position) : 0;
  }
}

export class IndiFilterWheel extends IndiDevice {
  async setFilter(position: number): Promise<void> {
    await this.client.setProp(this.deviceName, "FILTER_SLOT", {
      FILTER_SLOT_VALUE: position.toString(),
    });
    await this.waitForState("FILTER_SLOT", "Ok");
  }

  async getCurrentFilter(): Promise<number> {
    const prop = this.client.getProperty(this.deviceName, "FILTER_SLOT");
    const position = prop?.elements.get("FILTER_SLOT_VALUE")?.value;
    return position ? parseInt(position) : 1;
  }

  async getFilterNames(): Promise<string[]> {
    const prop = this.client.getProperty(this.deviceName, "FILTER_NAME");
    const names: string[] = [];

    if (prop) {
      for (const [key, element] of prop.elements) {
        if (key.startsWith("FILTER_SLOT_NAME_")) {
          names.push(element.value);
        }
      }
    }

    return names;
  }
}
