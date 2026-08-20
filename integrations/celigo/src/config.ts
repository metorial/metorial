import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe('Celigo deployment region. US (North America) or EU (Germany).'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
