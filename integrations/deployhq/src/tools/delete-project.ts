import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a DeployHQ project and all associated servers, deployments, and configuration. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project to delete')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Deletion status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let result = await client.deleteProject(ctx.input.projectPermalink);

    return {
      output: {
        status: result.status || 'deleted'
      },
      message: `Deleted project \`${ctx.input.projectPermalink}\`.`
    };
  })
  .build();
