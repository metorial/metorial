import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    datacenter: z
      .enum(['us', 'eu'])
      .default('us')
      .describe(
        'The datacenter region where your Heap data is stored. Use "eu" if your Heap data is in an EU datacenter.'
      )
  })
);
