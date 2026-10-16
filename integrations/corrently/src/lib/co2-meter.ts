import { z } from 'zod';
export let co2MeterOutput = z.object({
  meterId: z
    .string()
    .optional()
    .describe('Save this ID for get_co2_meter and update_co2_meter'),
  reading: z.number().optional().describe('Last processed electricity meter reading in Wh'),
  co2: z.number().optional().describe('Accumulated CO2 meter reading'),
  created: z.number().optional(),
  updated: z.number().optional(),
  expires: z
    .number()
    .optional()
    .describe('Expiry timestamp; the provider removes meters not updated before this time'),
  raw: z.unknown().describe('Complete provider response including the location forecast')
});
