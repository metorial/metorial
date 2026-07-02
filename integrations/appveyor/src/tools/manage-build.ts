import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let manageBuild = SlateTool.create(spec, {
  name: 'Manage Build',
  key: 'manage_build',
  description: `Re-run, cancel, or delete an existing build. Use this to manage builds that have already been triggered.`,
  instructions: [
    'For **rerun**: provide buildId. Optionally set reRunIncomplete to only re-run incomplete jobs.',
    'For **cancel**: provide accountName, projectSlug, and buildVersion.',
    'For **delete**: provide buildId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['rerun', 'cancel', 'delete'])
        .describe('Operation to perform on the build'),
      buildId: z.number().optional().describe('Build ID (required for rerun and delete)'),
      reRunIncomplete: z
        .boolean()
        .optional()
        .describe('Only re-run incomplete jobs when re-running'),
      accountName: z.string().optional().describe('Account name (required for cancel)'),
      projectSlug: z.string().optional().describe('Project slug (required for cancel)'),
      buildVersion: z
        .string()
        .optional()
        .describe('Build version string (required for cancel)')
    })
  )
  .output(
    z.object({
      build: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Build details (for rerun)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    switch (ctx.input.action) {
      case 'rerun': {
        if (ctx.input.buildId === undefined) {
          throw new Error('buildId is required for rerun');
        }
        let build = await client.reRunBuild({
          buildId: ctx.input.buildId,
          reRunIncomplete: ctx.input.reRunIncomplete
        });
        return {
          output: { build, success: true },
          message: `Re-ran build **${ctx.input.buildId}**.`
        };
      }

      case 'cancel': {
        if (!ctx.input.accountName || !ctx.input.projectSlug || !ctx.input.buildVersion) {
          throw new Error(
            'accountName, projectSlug, and buildVersion are required for cancel'
          );
        }
        await client.cancelBuild(
          ctx.input.accountName,
          ctx.input.projectSlug,
          ctx.input.buildVersion
        );
        return {
          output: { success: true },
          message: `Cancelled build **${ctx.input.buildVersion}** for **${ctx.input.accountName}/${ctx.input.projectSlug}**.`
        };
      }

      case 'delete': {
        if (ctx.input.buildId === undefined) {
          throw new Error('buildId is required for delete');
        }
        await client.deleteBuild(ctx.input.buildId);
        return {
          output: { success: true },
          message: `Deleted build **${ctx.input.buildId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
