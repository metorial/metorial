import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    adminDomain: z
      .string()
      .describe(
        'The Ghost site domain (e.g., "mysite.ghost.io" or "blog.example.com"). Do not include the protocol (https://).'
      )
  })
);
