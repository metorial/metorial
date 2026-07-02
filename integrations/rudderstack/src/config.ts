import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    datePlaneUrl: z
      .string()
      .describe(
        'Your RudderStack Data Plane URL (e.g., https://hosted.rudderlabs.com). Required for sending events via the HTTP API.'
      )
      .optional(),
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe('RudderStack deployment region. Determines the Control Plane API base URL.')
  })
);
