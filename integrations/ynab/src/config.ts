import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    budgetId: z
      .string()
      .default('last-used')
      .describe(
        'Budget ID to use. Defaults to "last-used". Can also use "default" or a specific budget UUID.'
      )
  })
);
