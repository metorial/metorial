import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu', 'ap', 'ko', 'us1', 'eu1'])
        .default('us')
        .describe(
          'Kaleido deployment region. US (AWS Ohio), EU (AWS Frankfurt), AP (AWS Sydney), KO (AWS Seoul), US1 (Azure Washington), EU1 (Azure France)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
