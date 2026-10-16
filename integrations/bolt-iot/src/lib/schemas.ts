import { z } from 'zod';

export let deviceName = z
  .string()
  .optional()
  .describe(
    'Device ID to target, such as BOLT1234567. Call list_devices to discover devices. Omit to use the device saved with the connection.'
  );

export let rawResponse = z.unknown().optional().describe('Complete provider response.');
