import { SlateTool } from 'slates';
import { z } from 'zod';
import { unsupportedAppWrite } from '../lib/client';
import { spec } from '../spec';

export let createApp = SlateTool.create(spec, {
  name: 'Create App',
  key: 'create_app',
  description:
    'Compatibility action. The current Retool API reference has no documented supported route for this app definition write. Edit or create the app in Retool, then read its metadata with list_apps or get_app.'
})
  .input(
    z.object({
      appName: z.string().describe('Name for the new application'),
      folderId: z.string().optional().describe('ID of the folder to place the app in'),
      description: z.string().optional().describe('Description of the application')
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
