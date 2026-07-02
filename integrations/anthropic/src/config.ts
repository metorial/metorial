import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiVersion: z.string().default('2023-06-01').describe('Anthropic API version header value')
  })
);
