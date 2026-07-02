import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    designSystemId: z
      .string()
      .optional()
      .describe('The ID of the InVision DSM design system to interact with')
  })
);
