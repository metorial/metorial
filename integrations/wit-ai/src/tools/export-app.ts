import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportApp = SlateTool.create(spec, {
  name: 'Export App',
  key: 'export_app',
  description: `Export the current Wit.ai app configuration as a downloadable URL. The export includes intents, entities, traits, utterances, and all app settings. Useful for backup, migration, or duplicating apps.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      downloadUri: z.string().describe('URL to download the exported app data as a zip file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.exportApp();

    return {
      output: {
        downloadUri: typeof result === 'string' ? result : (result.uri ?? result.url ?? '')
      },
      message: `App export ready for download.`
    };
  })
  .build();
