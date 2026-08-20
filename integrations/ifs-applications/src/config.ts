import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .describe(
          'Base URL for the IFS Cloud tenant, without /main or /int (for example, https://example.ifscloud.com).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultCompany: {
      schema: z
        .string()
        .optional()
        .describe('Optional default IFS company for future company-scoped business tools.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultSite: {
      schema: z
        .string()
        .optional()
        .describe('Optional default IFS site for future site-scoped business tools.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    apiRelease: {
      schema: z
        .string()
        .optional()
        .describe('Optional IFS Cloud release label for operator context, such as 26R1.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultPageSize: {
      schema: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Default number of rows to request for bounded projection queries.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
