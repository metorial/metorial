import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .describe(
        'Your Mailcoach subdomain (the "your-domain" portion of your-domain.mailcoach.app)'
      )
  })
);
