import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe(
          'Segment data region. Determines API base URLs for both Public and Tracking APIs.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
