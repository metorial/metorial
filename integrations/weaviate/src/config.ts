import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    instanceUrl: {
      schema: z
        .string()
        .describe(
          'The REST endpoint URL of the Weaviate instance (e.g. https://my-cluster.weaviate.network)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
