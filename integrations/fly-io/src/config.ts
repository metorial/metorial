import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.machines.dev')
        .describe('Base URL for the Fly.io Machines API'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    appName: {
      schema: z
        .string()
        .optional()
        .describe('Default Fly App name to use for triggers and actions when not specified'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    orgSlug: {
      schema: z.string().optional().describe('Default organization slug'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
