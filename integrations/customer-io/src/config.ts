import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe(
          'The data center region for your Customer.io account. US is the default for most accounts.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
