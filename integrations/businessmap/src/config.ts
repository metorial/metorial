import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe(
        'Your Kanbanize account subdomain (e.g. "mycompany" from mycompany.kanbanize.com)'
      )
  })
);
