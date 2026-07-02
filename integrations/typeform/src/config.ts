import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .enum(['https://api.typeform.com', 'https://api.eu.typeform.com'])
      .default('https://api.typeform.com')
      .describe(
        'API base URL. Use the EU URL if your account is configured for the EU Data Center.'
      ),
    formId: z
      .string()
      .optional()
      .describe('Default form ID for webhook triggers and form-specific operations')
  })
);
