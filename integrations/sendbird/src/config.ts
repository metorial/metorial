import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    applicationId: z
      .string()
      .describe(
        'Your Sendbird Application ID (case-sensitive). Found in your Sendbird Dashboard under Settings > Application > General.'
      )
  })
);
