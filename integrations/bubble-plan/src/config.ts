import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .describe('Your Project Bubble domain (e.g., mydomain.projectbubble.com)')
  })
);
