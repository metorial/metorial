import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    serverUrl: z
      .string()
      .default('https://ntfy.sh')
      .describe(
        'Base URL of the ntfy server. Defaults to the public ntfy.sh server. Set to your self-hosted instance URL if applicable.'
      )
  })
);
