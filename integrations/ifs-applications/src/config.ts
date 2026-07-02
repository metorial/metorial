import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .describe(
        'Base URL for the IFS Cloud tenant, without /main or /int (for example, https://example.ifscloud.com).'
      ),
    defaultCompany: z
      .string()
      .optional()
      .describe('Optional default IFS company for future company-scoped business tools.'),
    defaultSite: z
      .string()
      .optional()
      .describe('Optional default IFS site for future site-scoped business tools.'),
    apiRelease: z
      .string()
      .optional()
      .describe('Optional IFS Cloud release label for operator context, such as 26R1.'),
    defaultPageSize: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Default number of rows to request for bounded projection queries.')
  })
);
