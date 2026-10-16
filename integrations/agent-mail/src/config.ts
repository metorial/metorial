import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    podId: z
      .string()
      .optional()
      .describe(
        'Optional pod ID for inbox, domain, webhook, and allow/block list management. Call list_pods to discover pod IDs. Message, thread, and draft tools use their inboxId input.'
      )
  })
);
