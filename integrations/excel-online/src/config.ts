import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    driveId: {
      schema: z
        .string()
        .optional()
        .describe(
          'The ID of the OneDrive for Business or SharePoint drive. If not provided, the default drive of the authenticated user will be used.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    siteId: {
      schema: z
        .string()
        .optional()
        .describe(
          'The SharePoint site ID to use for accessing workbooks. If provided, driveId is relative to this site.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
