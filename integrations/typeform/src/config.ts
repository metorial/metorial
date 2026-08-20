import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .enum(['https://api.typeform.com', 'https://api.eu.typeform.com'])
        .default('https://api.typeform.com')
        .describe(
          'API base URL. Use the EU URL if your account is configured for the EU Data Center.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    formId: {
      schema: z
        .string()
        .optional()
        .describe('Default form ID for webhook triggers and form-specific operations'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
