import { indigoIntegrationService } from "./indigo-integration.service";
import { indiIntegrationService } from "./indi-integration.service";

const backend = process.env.DRIVER_BACKEND?.toLowerCase() === "indigo" ? "indigo" : "indi";

export const driverBackend = backend;

export const driverIntegrationService: any =
  backend === "indigo" ? indigoIntegrationService : indiIntegrationService;
