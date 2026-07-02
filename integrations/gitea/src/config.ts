import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .describe('Base URL of the Gitea instance, e.g. https://gitea.example.com')
  })
);
