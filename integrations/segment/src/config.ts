import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe(
        'Segment data region. Determines API base URLs for both Public and Tracking APIs.'
      )
  })
);
