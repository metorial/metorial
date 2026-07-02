import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    companyDomain: z
      .string()
      .describe(
        'Your Pipedrive company domain (e.g. "mycompany" from mycompany.pipedrive.com)'
      )
  })
);
