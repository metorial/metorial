import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently deletes a Neon project and all its branches, databases, endpoints, and roles. The project can be recovered within the deletion grace period using the recover project tool.`,
  constraints: [
    'This action is permanent after the grace period. All branches, databases, and endpoints will be deleted.',
    'Project-scoped API keys cannot delete the project they are scoped to.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to delete')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the deleted project'),
      name: z.string().describe('Name of the deleted project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.deleteProject(ctx.input.projectId);
    let p = result.project;

    return {
      output: {
        projectId: p.id,
        name: p.name
      },
      message: `Deleted project **${p.name}** (${p.id}). It may be recoverable during the grace period.`
    };
  })
  .build();
