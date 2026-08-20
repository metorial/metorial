import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiEndpoint: {
      schema: z
        .string()
        .describe(
          'Your Wati API endpoint URL (e.g. https://live-server-XXXXX.wati.io). Found in Wati Dashboard under API Docs.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
