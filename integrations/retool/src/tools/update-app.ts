import { SlateTool } from 'slates';
import { z } from 'zod';
import { unsupportedAppWrite } from '../lib/client';
import { spec } from '../spec';

export let updateApp = SlateTool.create(spec, {
  name: 'Update App',
  key: 'update_app',
  description:
    'Compatibility action. The current Retool API reference has no documented supported route for this app definition write. Edit or create the app in Retool, then read its metadata with list_apps or get_app.'
})
  .input(
    z.object({
      appId: z.string().describe('The ID of the app to update'),
      appName: z.string().optional().describe('New name for the application'),
      folderId: z
        .string()
        .nullable()
        .optional()
        .describe('New folder ID (set to null to move to root)')
    })
  )
  .output(
    z.object({
      appId: z.string(),
      appName: z.string(),
      folderId: z.string().nullable().optional()
    })
  )
  .handleInvocation(async () => {
    throw unsupportedAppWrite();
  })
  .build();
