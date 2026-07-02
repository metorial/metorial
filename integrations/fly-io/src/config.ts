import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.machines.dev')
      .describe('Base URL for the Fly.io Machines API'),
    appName: z
      .string()
      .optional()
      .describe('Default Fly App name to use for triggers and actions when not specified'),
    orgSlug: z.string().optional().describe('Default organization slug')
  })
);
