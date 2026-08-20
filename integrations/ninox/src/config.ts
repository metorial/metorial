import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.ninox.com')
        .describe(
          'Base URL for the Ninox API. Use https://api.ninox.com for Public Cloud, or https://{your-instance}.ninoxdb.de for Private Cloud / On-Premises.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    teamId: {
      schema: z
        .string()
        .optional()
        .describe('Default team (workspace) ID. Required for the change tracking trigger.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    databaseId: {
      schema: z
        .string()
        .optional()
        .describe('Default database ID. Required for the change tracking trigger.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
