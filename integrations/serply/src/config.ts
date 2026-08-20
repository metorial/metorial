import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    proxyLocation: {
      schema: z
        .enum([
          'US',
          'EU',
          'CA',
          'GB',
          'FR',
          'DE',
          'SE',
          'IE',
          'IN',
          'JP',
          'KR',
          'SG',
          'AU',
          'BR'
        ])
        .optional()
        .describe('Default geographic location for geo-targeted search results'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    deviceType: {
      schema: z
        .enum(['desktop', 'mobile'])
        .default('desktop')
        .describe('Default device type for search results'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
