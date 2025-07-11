import { DOMParser, Element as XMLElement } from "@xmldom/xmldom";

import { EventEmitter } from "events";
import { Socket } from "net";

export interface IndiProperty {
  device: string;
  name: string;
  label?: string;
  group?: string;
  state: "Idle" | "Ok" | "Busy" | "Alert";
  perm: "ro" | "wo" | "rw";
  elements: Map<string, IndiElement>;
}

export interface IndiElement {
  name: string;
  label?: string;
  value: string;
  format?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface IndiDevice {
  name: string;
  properties: Map<string, IndiProperty>;
}

export class IndiClient extends EventEmitter {
  private socket: Socket | null = null;
  private devices: Map<string, IndiDevice> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isConnected = false;
  private parser = new DOMParser();
  private buffer = "";

  constructor(private host: string = "localhost", private port: number = 7624) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new Socket();

      this.socket.connect(this.port, this.host, () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Send mandatory first packet
        this.sendRaw("<getProperties version='1.7'/>");

        this.emit("connected");
        resolve();
      });

      this.socket.on("data", (data) => {
        this.handleData(data);
      });

      this.socket.on("error", (error) => {
        this.emit("error", error);
        if (!this.isConnected) {
          reject(error);
        }
      });

      this.socket.on("close", () => {
        this.isConnected = false;
        this.emit("disconnected");
        this.attemptReconnect();
      });
    });
  }

  private handleData(data: Buffer): void {
    this.buffer += data.toString();

    // Split by newlines to process complete XML elements
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        this.processXmlLine(line);
      }
    }
  }

  private processXmlLine(line: string): void {
    try {
      const doc = this.parser.parseFromString(line, "text/xml");
      const root = doc.documentElement;

      if (!root) return;

      const device = root.getAttribute("device") || "";
      const name = root.getAttribute("name") || "";

      switch (root.tagName) {
        case "defNumber":
        case "defSwitch":
        case "defText":
        case "defLight":
        case "defBLOB":
          this.handlePropertyDefinition(root, device, name);
          break;

        case "setNumber":
        case "setSwitch":
        case "setText":
        case "setLight":
        case "setBLOB":
          this.handlePropertyUpdate(root, device, name);
          break;

        case "newNumber":
        case "newSwitch":
        case "newText":
        case "newLight":
        case "newBLOB":
          this.handlePropertyUpdate(root, device, name);
          break;

        case "delProperty":
          this.handlePropertyDeletion(device, name);
          break;

        case "message":
          this.handleMessage(root, device);
          break;
      }
    } catch (error) {
      console.error("XML Parse Error:", error, "Line:", line);
    }
  }

  private handlePropertyDefinition(
    element: XMLElement,
    device: string,
    name: string
  ): void {
    if (!this.devices.has(device)) {
      this.devices.set(device, {
        name: device,
        properties: new Map(),
      });
    }

    const deviceObj = this.devices.get(device)!;
    const property: IndiProperty = {
      device,
      name,
      label: element.getAttribute("label") || name,
      group: element.getAttribute("group") || "",
      state: (element.getAttribute("state") as any) || "Idle",
      perm: (element.getAttribute("perm") as any) || "rw",
      elements: new Map(),
    };

    // Parse elements
    const elements = element.getElementsByTagName("*");
    for (let i = 0; i < elements.length; i++) {
      const elem = elements[i];
      const elemName = elem.getAttribute("name");
      if (elemName) {
        property.elements.set(elemName, {
          name: elemName,
          label: elem.getAttribute("label") || elemName,
          value: elem.textContent || "",
          format: elem.getAttribute("format") || undefined,
          min: elem.getAttribute("min")
            ? parseFloat(elem.getAttribute("min")!)
            : undefined,
          max: elem.getAttribute("max")
            ? parseFloat(elem.getAttribute("max")!)
            : undefined,
          step: elem.getAttribute("step")
            ? parseFloat(elem.getAttribute("step")!)
            : undefined,
        });
      }
    }

    deviceObj.properties.set(name, property);
    this.emit("propertyDefined", device, name, property);
  }

  private handlePropertyUpdate(
    element: XMLElement,
    device: string,
    name: string
  ): void {
    const deviceObj = this.devices.get(device);
    if (!deviceObj) return;

    const property = deviceObj.properties.get(name);
    if (!property) return;

    // Update state
    const newState = element.getAttribute("state");
    if (newState) {
      property.state = newState as any;
    }

    // Update element values
    const elements = element.getElementsByTagName("*");
    for (let i = 0; i < elements.length; i++) {
      const elem = elements[i];
      const elemName = elem.getAttribute("name");
      if (elemName && property.elements.has(elemName)) {
        const propertyElement = property.elements.get(elemName)!;
        propertyElement.value = elem.textContent || "";
      }
    }

    this.emit("propertyUpdated", device, name, property);
  }

  private handlePropertyDeletion(device: string, name: string): void {
    const deviceObj = this.devices.get(device);
    if (deviceObj) {
      if (name) {
        deviceObj.properties.delete(name);
      } else {
        // Delete entire device
        this.devices.delete(device);
      }
      this.emit("propertyDeleted", device, name);
    }
  }

  private handleMessage(element: XMLElement, device: string): void {
    const message = element.textContent || "";
    const timestamp = element.getAttribute("timestamp") || "";
    this.emit("message", device, message, timestamp);
  }

  private sendRaw(xml: string): void {
    if (this.socket && this.isConnected) {
      this.socket.write(xml + "\n");
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      setTimeout(() => {
        this.connect().catch(() => {
          // Reconnection failed, will try again
        });
      }, delay);
    } else {
      this.emit("maxReconnectAttemptsReached");
    }
  }

  // High-level API methods
  async getProp(
    device: string,
    property: string,
    element?: string
  ): Promise<string> {
    const deviceObj = this.devices.get(device);
    if (!deviceObj) return "";

    const prop = deviceObj.properties.get(property);
    if (!prop) return "";

    if (element) {
      const elem = prop.elements.get(element);
      return elem?.value || "";
    }

    // Return first element value if no specific element requested
    const firstElement = prop.elements.values().next().value;
    return firstElement?.value || "";
  }

  async setProp(
    device: string,
    property: string,
    elements: Record<string, string>
  ): Promise<void> {
    const deviceObj = this.devices.get(device);
    if (!deviceObj) throw new Error(`Device ${device} not found`);

    const prop = deviceObj.properties.get(property);
    if (!prop)
      throw new Error(`Property ${property} not found on device ${device}`);

    // Determine property type based on existing elements
    const firstElement = prop.elements.values().next().value;
    if (!firstElement)
      throw new Error(`No elements found for property ${property}`);

    let xml = "";
    const elementEntries = Object.entries(elements);

    // Determine XML type based on property type (simplified logic)
    if (prop.elements.has("CONNECT") || prop.elements.has("DISCONNECT")) {
      // Switch property
      xml = `<newSwitch device="${device}" name="${property}">`;
      for (const [name, value] of elementEntries) {
        xml += `<oneSwitch name="${name}">${value}</oneSwitch>`;
      }
      xml += `</newSwitch>`;
    } else if (
      typeof parseFloat(firstElement.value) === "number" &&
      !isNaN(parseFloat(firstElement.value))
    ) {
      // Number property
      xml = `<newNumber device="${device}" name="${property}">`;
      for (const [name, value] of elementEntries) {
        xml += `<oneNumber name="${name}">${value}</oneNumber>`;
      }
      xml += `</newNumber>`;
    } else {
      // Text property
      xml = `<newText device="${device}" name="${property}">`;
      for (const [name, value] of elementEntries) {
        xml += `<oneText name="${name}">${value}</oneText>`;
      }
      xml += `</newText>`;
    }

    this.sendRaw(xml);
  }

  async enableBLOB(
    device: string,
    property?: string,
    mode: "Never" | "Also" | "Only" = "Also"
  ): Promise<void> {
    let xml = `<enableBLOB device="${device}"`;
    if (property) {
      xml += ` name="${property}"`;
    }
    xml += ` mode="${mode}"></enableBLOB>`;
    this.sendRaw(xml);
  }

  getDevices(): string[] {
    return Array.from(this.devices.keys());
  }

  getDevice(name: string): IndiDevice | undefined {
    return this.devices.get(name);
  }

  getProperty(device: string, property: string): IndiProperty | undefined {
    return this.devices.get(device)?.properties.get(property);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.isConnected = false;
  }
}
