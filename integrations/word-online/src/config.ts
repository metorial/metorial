import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    driveId: {
      schema: z
        .string()
        .optional()
        .describe(
          "The ID of the OneDrive or SharePoint drive to use. If not specified, the current user's default drive is used."
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    siteId: {
      schema: z
        .string()
        .optional()
        .describe(
          'The SharePoint site ID. Required when working with SharePoint document libraries instead of OneDrive.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
