import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe(
        'Default current Xata organization ID returned by list_organizations; current tools also accept an explicit override'
      ),
    workspaceId: z
      .string()
      .optional()
      .describe(
        'Retired Xata Lite workspace ID; preserved for legacy contracts and not used as a current organization ID.'
      ),
    region: z
      .string()
      .default('us-east-1')
      .describe('Retired Xata Lite workspace region; preserved for legacy contracts.'),
    databaseName: z
      .string()
      .optional()
      .describe('Retired Xata Lite database name; preserved for legacy contracts.'),
    branch: z
      .string()
      .default('main')
      .describe(
        'Retired Xata Lite default branch name; current tools use project and branch IDs.'
      )
  })
);
