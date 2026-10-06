import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.machines.dev')
      .describe('Base URL for the Fly.io Machines API'),
    orgSlug: z.string().optional().describe('Default organization slug')
  })
);
