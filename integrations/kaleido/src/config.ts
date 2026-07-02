import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu', 'ap', 'ko', 'us1', 'eu1'])
      .default('us')
      .describe(
        'Kaleido deployment region. US (AWS Ohio), EU (AWS Frankfurt), AP (AWS Sydney), KO (AWS Seoul), US1 (Azure Washington), EU1 (Azure France)'
      )
  })
);
