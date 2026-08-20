import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe(
          'Census organization region. US uses app.getcensus.com, EU uses app-eu.getcensus.com.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
