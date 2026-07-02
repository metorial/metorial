import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .describe('The SatisMeter Project ID. Found in Settings > Integrations > API.')
  })
);
