import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe('The URL of the Odoo instance (e.g., https://mycompany.odoo.com)'),
    database: z.string().describe('The name of the Odoo database to connect to')
  })
);
