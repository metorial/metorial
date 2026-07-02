import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    serverUrl: z
      .string()
      .describe('Tableau Server or Tableau Cloud URL (e.g., https://10ay.online.tableau.com)'),
    siteContentUrl: z
      .string()
      .default('')
      .describe(
        'Site content URL identifier (e.g., "my-site"). Leave empty for the default site.'
      ),
    apiVersion: z.string().default('3.28').describe('Tableau REST API version (e.g., "3.28")')
  })
);
