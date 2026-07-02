import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    proxyLocation: z
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
    deviceType: z
      .enum(['desktop', 'mobile'])
      .default('desktop')
      .describe('Default device type for search results')
  })
);
