import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportApp = SlateTool.create(spec, {
  name: 'Export App',
  key: 'export_app',
  description: `Export a ToolJet application from a workspace as JSON. The export includes pages, queries, data sources, environments, versions, and metadata. Optionally include ToolJet Database data or export specific/all versions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('UUID of the workspace containing the application'),
      appId: z.string().describe('UUID of the application to export'),
      exportTJDB: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include ToolJet Database data in the export'),
      appVersion: z
        .string()
        .optional()
        .describe('Specific version name to export (e.g., "v1")'),
      exportAllVersions: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to export all versions of the application')
    })
  )
  .output(
    z.object({
      exportData: z.any().describe('The full exported application JSON'),
      tooljetVersion: z.string().optional().describe('ToolJet version used for the export')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.exportApp(ctx.input.workspaceId, ctx.input.appId, {
      exportTJDB: ctx.input.exportTJDB,
      appVersion: ctx.input.appVersion,
      exportAllVersions: ctx.input.exportAllVersions
    });

    return {
      output: {
        exportData: result,
        tooljetVersion: result?.tooljet_version
      },
      message: `Exported application ${ctx.input.appId} from workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();
