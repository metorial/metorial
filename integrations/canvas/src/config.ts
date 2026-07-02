import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    canvasDomain: z
      .string()
      .describe(
        'Your Canvas instance domain (e.g., myschool.instructure.com). Do not include https:// prefix.'
      )
  })
);
