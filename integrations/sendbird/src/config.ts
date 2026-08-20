import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    applicationId: {
      schema: z
        .string()
        .describe(
          'Your Sendbird Application ID (case-sensitive). Found in your Sendbird Dashboard under Settings > Application > General.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
