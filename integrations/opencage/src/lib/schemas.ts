import { z } from 'zod';

export let annotationsSchema = z
  .object({
    timezone: z
      .object({
        name: z.string().optional(),
        offsetSec: z.number().optional(),
        offsetString: z.string().optional(),
        shortName: z.string().optional(),
        nowInDst: z.boolean().optional()
      })
      .optional()
      .describe('Timezone information for the location'),
    currency: z
      .object({
        name: z.string().optional(),
        isoCode: z.string().optional(),
        symbol: z.string().optional()
      })
      .optional()
      .describe('Local currency information'),
    callingCode: z.number().optional().describe('International dialing code'),
    flag: z.string().optional().describe('Country flag emoji'),
    geohash: z.string().optional().describe('Geohash representation'),
    qibla: z.number().optional().describe('Direction to Mecca in degrees'),
    what3words: z.string().optional().describe('what3words address'),
    dms: z
      .object({
        lat: z.string().optional(),
        lng: z.string().optional()
      })
      .optional()
      .describe('Coordinates in degrees, minutes, seconds format'),
    mgrs: z.string().optional().describe('Military Grid Reference System coordinate'),
    maidenhead: z.string().optional().describe('Maidenhead Locator System grid reference'),
    mercator: z
      .object({
        x: z.number().optional(),
        y: z.number().optional()
      })
      .optional()
      .describe('Mercator projection coordinates (EPSG:3857)'),
    sun: z
      .object({
        rise: z
          .object({
            apparent: z.number().optional(),
            astronomical: z.number().optional(),
            civil: z.number().optional(),
            nautical: z.number().optional()
          })
          .optional(),
        set: z
          .object({
            apparent: z.number().optional(),
            astronomical: z.number().optional(),
            civil: z.number().optional(),
            nautical: z.number().optional()
          })
          .optional()
      })
      .optional()
      .describe('Sunrise and sunset times as unix timestamps'),
    roadinfo: z
      .object({
        driveOn: z.string().optional(),
        road: z.string().optional(),
        roadType: z.string().optional(),
        speedIn: z.string().optional()
      })
      .optional()
      .describe('Road and driving information'),
    osm: z
      .object({
        editUrl: z.string().optional(),
        noteUrl: z.string().optional(),
        url: z.string().optional()
      })
      .optional()
      .describe('OpenStreetMap links')
  })
  .optional();

export let geocodeResultSchema = z.object({
  formatted: z.string().describe('Formatted address string'),
  latitude: z.number().describe('Latitude coordinate'),
  longitude: z.number().describe('Longitude coordinate'),
  confidence: z.number().describe('Confidence score from 0 (lowest) to 10 (highest)'),
  components: z
    .record(z.string(), z.union([z.string(), z.number()]))
    .describe('Address components (country, city, road, etc.)'),
  bounds: z
    .object({
      northeast: z.object({ lat: z.number(), lng: z.number() }),
      southwest: z.object({ lat: z.number(), lng: z.number() })
    })
    .optional()
    .describe('Bounding box of the result'),
  annotations: annotationsSchema
});
