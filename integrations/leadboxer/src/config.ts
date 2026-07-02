import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    datasetId: z
      .string()
      .describe(
        'The Dataset ID (site) that identifies which dataset to query or send data to. Found in your LeadBoxer account under Integrations > Data.'
      )
  })
);
