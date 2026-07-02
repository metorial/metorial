import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .describe('The Paradym project ID. Found in the Settings tab on the Paradym dashboard.')
  })
);
