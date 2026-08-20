import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountName: {
      schema: z
        .string()
        .describe(
          'Your CentralStationCRM account subdomain (e.g., "mycompany" from mycompany.centralstationcrm.net)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
