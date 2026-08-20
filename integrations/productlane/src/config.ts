import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Productlane workspace ID. Required for portal, changelog, and workspace endpoints.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
