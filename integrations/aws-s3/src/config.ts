import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .string()
      .default('us-east-1')
      .describe('AWS region for S3 operations (e.g., us-east-1, eu-west-1)')
  })
);
