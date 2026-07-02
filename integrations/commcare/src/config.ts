import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .describe(
        'The CommCare project space (domain) name, found in your CommCare HQ URL: https://www.commcarehq.org/a/[domain]/'
      )
  })
);
