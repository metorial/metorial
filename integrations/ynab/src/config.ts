import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    budgetId: {
      schema: z
        .string()
        .default('last-used')
        .describe(
          'Budget ID to use. Defaults to "last-used". Can also use "default" or a specific budget UUID.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
