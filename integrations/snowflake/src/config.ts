import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountIdentifier: {
      schema: z
        .string()
        .describe(
          'Snowflake account identifier in the format org_name-account_name (e.g. myorg-myaccount). Used to construct the base URL for API requests.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    warehouse: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default warehouse to use for SQL execution. Can be overridden per request.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    role: {
      schema: z
        .string()
        .optional()
        .describe('Default role to use for API requests. Can be overridden per request.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
