import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    budgetId: z
      .string()
      .trim()
      .min(1)
      .default('last-used')
      .describe(
        'Budget ID from list_budgets. Defaults to "last-used". Can also use "default" or a specific budget UUID.'
      )
  })
);
