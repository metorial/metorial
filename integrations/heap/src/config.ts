import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    datacenter: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe(
          'The datacenter region where your Heap data is stored. Use "eu" if your Heap data is in an EU datacenter.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
