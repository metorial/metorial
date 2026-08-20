import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    companyDomain: {
      schema: z
        .string()
        .describe(
          'Your Pipedrive company domain (e.g. "mycompany" from mycompany.pipedrive.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
