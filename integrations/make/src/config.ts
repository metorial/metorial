import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    zoneUrl: {
      schema: z
        .enum([
          'eu1.make.com',
          'eu2.make.com',
          'us1.make.com',
          'us2.make.com',
          'eu1.make.celonis.com',
          'us1.make.celonis.com'
        ])
        .default('eu1.make.com')
        .describe('Make API zone URL. Choose the zone where your organization is hosted.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
