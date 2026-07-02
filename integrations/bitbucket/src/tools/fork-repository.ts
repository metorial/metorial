import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let forkRepositoryTool = SlateTool.create(spec, {
  name: 'Fork Repository',
  key: 'fork_repository',
  description: `Fork an existing repository. The fork is created in the same workspace by default, or in a specified target workspace.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Source repository slug to fork'),
      newName: z.string().optional().describe('Name for the forked repository'),
      targetWorkspace: z
        .string()
        .optional()
        .describe('Target workspace slug for the fork (defaults to the configured workspace)'),
      isPrivate: z.boolean().optional().describe('Whether the fork should be private')
    })
  )
  .output(
    z.object({
      repoSlug: z.string(),
      fullName: z.string(),
      htmlUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let body: Record<string, any> = {};
    if (ctx.input.newName) body.name = ctx.input.newName;
    if (ctx.input.targetWorkspace) body.workspace = { slug: ctx.input.targetWorkspace };
    if (ctx.input.isPrivate !== undefined) body.is_private = ctx.input.isPrivate;

    let r = await client.forkRepository(ctx.input.repoSlug, body);

    return {
      output: {
        repoSlug: r.slug,
        fullName: r.full_name,
        htmlUrl: r.links?.html?.href || undefined
      },
      message: `Forked **${ctx.config.workspace}/${ctx.input.repoSlug}** → **${r.full_name}**.`
    };
  })
  .build();
