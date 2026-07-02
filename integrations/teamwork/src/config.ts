import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    siteName: z
      .string()
      .describe('Your Teamwork site name (e.g. "yourcompany" from yourcompany.teamwork.com)'),
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe('Data center region: "us" for .teamwork.com, "eu" for .eu.teamwork.com')
  })
);
