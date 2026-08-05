import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe('The URL of the Odoo instance (e.g., https://mycompany.odoo.com)'),
    database: z
      .string()
      .optional()
      .describe(
        'Database name. Required for legacy servers and multi-database deployments; otherwise optional for Odoo 19+ JSON-2.'
      )
  })
);
