import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .string()
      .describe('AWS region where your Cognito resources are located (e.g., us-east-1)')
  })
);
