import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceIdentifier: z
      .string()
      .optional()
      .describe(
        'Default workspace identifier. Retrieve from Workspace → Workflow → Integrations in the Affinda dashboard.'
      ),
    region: z
      .enum(['global', 'us', 'eu'])
      .default('global')
      .describe(
        'API region for data residency. Global (api.affinda.com), US (api.us1.affinda.com), or EU (api.eu1.affinda.com).'
      )
  })
);
