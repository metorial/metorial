import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    appId: z
      .string()
      .optional()
      .describe(
        'Legacy default App ID. Prefer the appId tool input; list_apps discovers IDs with an Organization API Key.'
      )
  })
);
