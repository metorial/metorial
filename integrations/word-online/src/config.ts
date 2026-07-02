import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    driveId: z
      .string()
      .optional()
      .describe(
        "The ID of the OneDrive or SharePoint drive to use. If not specified, the current user's default drive is used."
      ),
    siteId: z
      .string()
      .optional()
      .describe(
        'The SharePoint site ID. Required when working with SharePoint document libraries instead of OneDrive.'
      )
  })
);
