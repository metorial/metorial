import { z } from 'zod';

export let deviceInfoSchema = z
  .object({
    macAddress: z.string().describe('MAC address of the weather station device'),
    lastData: z
      .record(z.string(), z.any())
      .optional()
      .describe('Most recent data reading from the device'),
    info: z
      .object({
        name: z.string().optional().describe('User-assigned name for the device'),
        location: z.string().optional().describe('Location description for the device'),
        coords: z
          .object({
            coords: z
              .object({
                lat: z.number().optional(),
                lon: z.number().optional()
              })
              .optional(),
            address: z.string().optional(),
            location: z.string().optional(),
            elevation: z.number().optional(),
            geo: z
              .object({
                type: z.string().optional(),
                coordinates: z.array(z.number()).optional()
              })
              .optional()
          })
          .optional()
          .describe('Geographical coordinates')
      })
      .optional()
      .describe('Device metadata')
  })
  .passthrough();

export type DeviceInfo = z.infer<typeof deviceInfoSchema>;
export type WeatherData = Record<string, any>;
