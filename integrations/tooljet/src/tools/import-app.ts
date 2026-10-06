import { SlateTool } from 'slates';
import { Client } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { fail, jsonBytes, record, text, z } from '../lib/validation';
import { spec } from '../spec';
export const importApp = SlateTool.create(spec, {
  name: 'Import App',
  key: 'import_app',
  description:
    'Import an application JSON into a workspace discovered with list_workspaces. This may create apps, data sources and database schemas; no public app-delete route is documented for rollback. A native acknowledgment does not identify the created app.',
  constraints: ['Local request size bound: 8 MiB; the server may impose another limit.'],
  tags: { destructive: true }
})
  .input(z.object({ workspaceId, appName: z.string().optional(), exportData: z.any() }))
  .output(
    z.object({
      success: z.boolean(),
      accepted: z.boolean().optional(),
      verified: z.boolean().optional(),
      workspaceId: z.string().optional(),
      reconciliationRequired: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (
      !record(ctx.input.exportData) ||
      typeof ctx.input.exportData.tooljet_version !== 'string' ||
      !Array.isArray(ctx.input.exportData.app) ||
      !ctx.input.exportData.app.length
    )
      fail(
        'Provide the complete application JSON from export_app, including tooljet_version and app. Modules use a separate native endpoint.'
      );
    if (ctx.input.appName !== undefined) text(ctx.input.appName, 'app name');
    const body = {
      ...ctx.input.exportData,
      ...(ctx.input.appName === undefined ? {} : { appName: ctx.input.appName })
    };
    jsonBytes(body);
    const receipt = await new Client(ctx.auth, ctx.config).importApp(
      ctx.input.workspaceId,
      body
    );
    if (!record(receipt) || typeof receipt.message !== 'string' || !receipt.message.trim())
      fail(
        'The import may have taken effect but its native acknowledgment is incomplete. Inspect this workspace with list_apps and reconcile app, data-source and database effects before retrying.',
        'import_unverified',
        { workspaceId: ctx.input.workspaceId }
      );
    return {
      output: {
        success: true,
        accepted: true,
        verified: false,
        workspaceId: ctx.input.workspaceId,
        reconciliationRequired: true
      },
      message:
        'ToolJet accepted the import. Discover the resulting applications with list_apps and reconcile any app, data-source or database effects before retrying.'
    };
  })
  .build();
