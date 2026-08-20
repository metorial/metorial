import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    instanceUrl: {
      schema: z
        .string()
        .describe('The URL of the Odoo instance (e.g., https://mycompany.odoo.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    database: {
      schema: z
        .string()
        .optional()
        .describe(
          'Database name. Required for legacy servers and multi-database deployments; otherwise optional for Odoo 19+ JSON-2.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
