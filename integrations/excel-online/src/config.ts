import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    driveId: z
      .string()
      .optional()
      .describe(
        'The ID of the OneDrive for Business or SharePoint drive. If not provided, the default drive of the authenticated user will be used.'
      ),
    siteId: z
      .string()
      .optional()
      .describe(
        'The SharePoint site ID to use for accessing workbooks. If provided, driveId is relative to this site.'
      )
  })
);
