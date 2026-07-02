import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRepositoryTool = SlateTool.create(spec, {
  name: 'Get Repository',
  key: 'get_repository',
  description: `Retrieve detailed information about a specific repository including its settings, main branch, project, and links.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug (URL-friendly name)')
    })
  )
  .output(
    z.object({
      repoSlug: z.string(),
      name: z.string(),
      fullName: z.string(),
      description: z.string().optional(),
      isPrivate: z.boolean(),
      language: z.string().optional(),
      createdOn: z.string().optional(),
      updatedOn: z.string().optional(),
      mainBranch: z.string().optional(),
      projectKey: z.string().optional(),
      projectName: z.string().optional(),
      htmlUrl: z.string().optional(),
      cloneHttps: z.string().optional(),
      cloneSsh: z.string().optional(),
      forkPolicy: z.string().optional(),
      size: z.number().optional(),
      owner: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let r = await client.getRepository(ctx.input.repoSlug);

    let cloneLinks = r.links?.clone || [];
    let httpsClone = cloneLinks.find((c: any) => c.name === 'https');
    let sshClone = cloneLinks.find((c: any) => c.name === 'ssh');

    return {
      output: {
        repoSlug: r.slug,
        name: r.name,
        fullName: r.full_name,
        description: r.description || undefined,
        isPrivate: r.is_private,
        language: r.language || undefined,
        createdOn: r.created_on,
        updatedOn: r.updated_on,
        mainBranch: r.mainbranch?.name || undefined,
        projectKey: r.project?.key || undefined,
        projectName: r.project?.name || undefined,
        htmlUrl: r.links?.html?.href || undefined,
        cloneHttps: httpsClone?.href || undefined,
        cloneSsh: sshClone?.href || undefined,
        forkPolicy: r.fork_policy || undefined,
        size: r.size,
        owner: r.owner?.display_name || undefined
      },
      message: `Retrieved repository **${r.full_name}** (${r.is_private ? 'private' : 'public'}).`
    };
  })
  .build();
