import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    dataPlaneUrl: z
      .string()
      .optional()
      .describe(
        'Your source Data Plane URL. Use HTTPS for hosted or remotely accessible servers; self-hosted HTTP servers are supported.'
      ),
    datePlaneUrl: z
      .string()
      .describe(
        'Older spelling of dataPlaneUrl; preserved for existing connections. Prefer dataPlaneUrl for new settings.'
      )
      .optional(),
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe('RudderStack deployment region. Determines the Control Plane API base URL.')
  })
);
