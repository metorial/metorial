import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    siteName: {
      schema: z
        .string()
        .describe(
          'Your Teamwork site name (e.g. "yourcompany" from yourcompany.teamwork.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe('Data center region: "us" for .teamwork.com, "eu" for .eu.teamwork.com'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
