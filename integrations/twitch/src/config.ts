import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    broadcasterId: z
      .string()
      .optional()
      .describe(
        'Legacy optional broadcaster reference. Channel tools require an explicit broadcaster ID; discover IDs with get_user_info.'
      )
  })
);
