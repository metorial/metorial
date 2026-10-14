import { z } from 'zod';

export let deviceSchema = z.object({
  deviceId: z.string().describe('Device identifier'),
  name: z.string().describe('Device display name'),
  os: z.string().optional().describe('Operating system'),
  osVersion: z.string().optional().describe('OS version'),
  manufacturer: z.string().optional().describe('Device manufacturer'),
  isPrivate: z.boolean().optional().describe('Whether this is a private device'),
  screenSize: z.string().optional().describe('Screen size in inches'),
  cpuCores: z.number().optional().describe('Number of CPU cores'),
  ramSize: z.number().optional().describe('RAM size in MB')
});

export type SauceDevice = {
  id: string;
  name: string;
  os?: string | null;
  osVersion?: string | null;
  manufacturer?: string | string[] | null;
  isPrivate?: boolean | null;
  screenSize?: string | number | null;
  cpuCores?: number | null;
  ramSize?: number | null;
};

export let mapDevice = (device: SauceDevice) => ({
  deviceId: device.id,
  name: device.name,
  os: device.os ?? undefined,
  osVersion: device.osVersion ?? undefined,
  manufacturer: Array.isArray(device.manufacturer)
    ? device.manufacturer.join(', ')
    : (device.manufacturer ?? undefined),
  isPrivate: device.isPrivate ?? undefined,
  screenSize: device.screenSize == null ? undefined : String(device.screenSize),
  cpuCores: device.cpuCores ?? undefined,
  ramSize: device.ramSize ?? undefined
});
