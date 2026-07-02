import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountIdentifier: z
      .string()
      .describe(
        'Snowflake account identifier in the format org_name-account_name (e.g. myorg-myaccount). Used to construct the base URL for API requests.'
      ),
    warehouse: z
      .string()
      .optional()
      .describe('Default warehouse to use for SQL execution. Can be overridden per request.'),
    role: z
      .string()
      .optional()
      .describe('Default role to use for API requests. Can be overridden per request.')
  })
);
