import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    datePlaneUrl: {
      schema: z
        .string()
        .describe(
          'Your RudderStack Data Plane URL (e.g., https://hosted.rudderlabs.com). Required for sending events via the HTTP API.'
        )
        .optional(),
      visibility: 'plain',
      lifecycle: 'none'
    },
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe('RudderStack deployment region. Determines the Control Plane API base URL.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
