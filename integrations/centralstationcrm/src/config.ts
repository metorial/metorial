import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountName: z
      .string()
      .describe(
        'Your CentralStationCRM account subdomain (e.g., "mycompany" from mycompany.centralstationcrm.net)'
      )
  })
);
