import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .describe(
          'Your Mailcoach subdomain (the "your-domain" portion of your-domain.mailcoach.app)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
