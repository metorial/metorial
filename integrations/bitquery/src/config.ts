import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiVersion: {
      schema: z
        .enum(['v1', 'v2'])
        .default('v2')
        .describe(
          'Bitquery API version to use. V1 uses graphql.bitquery.io, V2 uses streaming.bitquery.io/graphql.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
