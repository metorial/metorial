import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z
    .object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Optional default workspace ID. Call list_organizations, then list_workspaces to discover authorized workspace IDs; tool inputs can override this default.'
        )
    })
    .passthrough()
);
