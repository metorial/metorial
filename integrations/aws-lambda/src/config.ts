import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z.string().describe('AWS region for Lambda API (e.g., us-east-1, eu-west-1)')
  })
);
