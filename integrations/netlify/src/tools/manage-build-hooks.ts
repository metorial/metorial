import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { netlifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let buildHookOutputSchema = z.object({
  buildHookId: z.string().describe('Build hook identifier'),
  siteId: z.string().describe('Site the build hook belongs to'),
  title: z.string().optional().describe('Build hook title'),
  branch: z.string().optional().describe('Branch the hook triggers'),
  url: z.string().optional().describe('Build hook trigger URL'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

let mapBuildHook = (hook: any) => ({
  buildHookId: hook.id,
  siteId: hook.site_id,
  title: hook.title ?? undefined,
  branch: hook.branch ?? undefined,
  url: hook.url ?? undefined,
  createdAt: hook.created_at ?? undefined
});

export let manageBuildHooks = SlateTool.create(spec, {
  name: 'Manage Build Hooks',
  key: 'manage_build_hooks',
  description: `List, get, create, update, or delete Netlify build hooks for a site. Build hooks provide trigger URLs for starting site builds.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      siteId: z.string().describe('The site ID'),
      buildHookId: z.string().optional().describe('Build hook ID for get, update, or delete'),
      title: z.string().optional().describe('Build hook title for create or update'),
      branch: z.string().optional().describe('Branch to build when the hook is triggered')
    })
  )
  .output(
    z.object({
      buildHooks: z
        .array(buildHookOutputSchema)
        .optional()
        .describe('Build hooks returned for list action'),
      buildHook: buildHookOutputSchema
        .optional()
        .describe('Build hook returned by get/create/update'),
      deleted: z.boolean().optional().describe('Whether the build hook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list': {
        let hooks = await client.listBuildHooks(ctx.input.siteId);
        let mapped = hooks.map(mapBuildHook);
        return {
          output: { buildHooks: mapped },
          message: `Found **${mapped.length}** build hook(s) for site **${ctx.input.siteId}**.`
        };
      }
      case 'get': {
        if (!ctx.input.buildHookId) {
          throw netlifyServiceError('buildHookId is required for get action');
        }
        let hook = await client.getBuildHook(ctx.input.siteId, ctx.input.buildHookId);
        return {
          output: { buildHook: mapBuildHook(hook) },
          message: `Retrieved build hook **${ctx.input.buildHookId}**.`
        };
      }
      case 'create': {
        if (!ctx.input.title) {
          throw netlifyServiceError('title is required for create action');
        }
        let hook = await client.createBuildHook(ctx.input.siteId, {
          title: ctx.input.title,
          branch: ctx.input.branch
        });
        return {
          output: { buildHook: mapBuildHook(hook) },
          message: `Created build hook **${ctx.input.title}** for site **${ctx.input.siteId}**.`
        };
      }
      case 'update': {
        if (!ctx.input.buildHookId) {
          throw netlifyServiceError('buildHookId is required for update action');
        }
        if (ctx.input.title === undefined && ctx.input.branch === undefined) {
          throw netlifyServiceError('title or branch is required for update action');
        }
        await client.updateBuildHook(ctx.input.siteId, ctx.input.buildHookId, {
          title: ctx.input.title,
          branch: ctx.input.branch
        });
        let hook = await client.getBuildHook(ctx.input.siteId, ctx.input.buildHookId);
        return {
          output: { buildHook: mapBuildHook(hook) },
          message: `Updated build hook **${ctx.input.buildHookId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.buildHookId) {
          throw netlifyServiceError('buildHookId is required for delete action');
        }
        await client.deleteBuildHook(ctx.input.siteId, ctx.input.buildHookId);
        return {
          output: { deleted: true },
          message: `Deleted build hook **${ctx.input.buildHookId}**.`
        };
      }
    }
  })
  .build();
