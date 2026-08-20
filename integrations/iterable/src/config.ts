import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    dataCenter: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe(
          'Iterable data center. US-based projects use "us", EU-based projects use "eu".'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
