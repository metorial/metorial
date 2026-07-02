import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCollaborators = SlateTool.create(spec, {
  name: 'Get Collaborators',
  key: 'get_collaborators',
  description: `List all collaborators in a shared project. Returns their names, emails, and IDs for use when assigning tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to list collaborators for')
    })
  )
  .output(
    z.object({
      collaborators: z
        .array(
          z.object({
            collaboratorId: z.string().describe('Collaborator user ID'),
            name: z.string().describe('Collaborator name'),
            email: z.string().describe('Collaborator email')
          })
        )
        .describe('Project collaborators')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let collaborators = await client.getCollaborators(ctx.input.projectId);

    return {
      output: { collaborators },
      message: `Retrieved **${collaborators.length}** collaborator(s) for project.`
    };
  });
