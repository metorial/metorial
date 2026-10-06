import { SlateTool } from 'slates';
import { Client } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { jsonBytes, text, z } from '../lib/validation';
import { spec } from '../spec';
export const exportApp = SlateTool.create(spec, {
  name: 'Export App',
  key: 'export_app',
  description:
    'Prepare a downloadable ToolJet application JSON file for an app discovered with list_apps and a workspace from list_workspaces. It can contain queries and data-source configuration. exportTJDB includes table schemas, not a promised data backup.',
  constraints: [
    'Local export size bound: 8 MiB. Reduce included versions/schema content if exceeded.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId,
      appId: z.string().describe('Exact app UUID from list_apps.'),
      exportTJDB: z.boolean().optional().default(false),
      appVersion: z.string().optional(),
      exportAllVersions: z.boolean().optional().default(false)
    })
  )
  .output(
    z.object({
      exportData: z
        .any()
        .optional()
        .describe(
          'Legacy field retained for compatibility. JSON is supplied as a downloadable file.'
        ),
      tooljetVersion: z.string().optional(),
      workspaceId: z.string().optional(),
      appId: z.string().optional(),
      filename: z.string().optional(),
      mimeType: z.string().optional(),
      size: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.appVersion !== undefined) text(ctx.input.appVersion, 'app version');
    const native = await new Client(ctx.auth, ctx.config).exportApp(
      ctx.input.workspaceId,
      ctx.input.appId,
      {
        exportTJDB: ctx.input.exportTJDB,
        appVersion: ctx.input.appVersion,
        exportAllVersions: ctx.input.exportAllVersions
      }
    );
    const bytes = jsonBytes(native),
      filename = 'application.json';
    await ctx.addAttachment({
      type: 'content',
      content: new Response(new Uint8Array(bytes), {
        headers: { 'content-type': 'application/json' }
      }),
      filename,
      mimeType: 'application/json'
    });
    return {
      output: {
        tooljetVersion: native.tooljet_version,
        workspaceId: ctx.input.workspaceId,
        appId: ctx.input.appId,
        filename,
        mimeType: 'application/json',
        size: bytes.length
      },
      message: 'Prepared the application JSON file for download.'
    };
  })
  .build();
