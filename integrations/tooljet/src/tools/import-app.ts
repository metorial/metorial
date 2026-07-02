import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let importApp = SlateTool.create(spec, {
  name: 'Import App',
  key: 'import_app',
  description: `Import a ToolJet application JSON into a workspace. The import data should be the JSON previously exported from a ToolJet instance. Optionally specify a custom app name to override the original.`,
  constraints: [
    'Maximum import size is 50 MB by default (configurable via MAX_JSON_SIZE on the server).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .describe('UUID of the target workspace to import the application into'),
      appName: z
        .string()
        .optional()
        .describe('Custom name for the imported application (overrides the original name)'),
      exportData: z.any().describe('The full application JSON data from a previous export')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the import was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let body = { ...ctx.input.exportData };
    if (ctx.input.appName) {
      body.appName = ctx.input.appName;
    }

    await client.importApp(ctx.input.workspaceId, body);

    return {
      output: { success: true },
      message: `Imported application into workspace ${ctx.input.workspaceId}${ctx.input.appName ? ` as **${ctx.input.appName}**` : ''}.`
    };
  })
  .build();
