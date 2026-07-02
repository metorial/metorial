import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe(
        'The REST endpoint URL of the Weaviate instance (e.g. https://my-cluster.weaviate.network)'
      )
  })
);
