import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageProjectPeople = SlateTool.create(spec, {
  name: 'Manage Project People',
  key: 'manage_project_people',
  description: `Add or remove people from a Teamwork project. Manage project membership by specifying person IDs to add or remove.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove people'),
      projectId: z.string().describe('Project ID'),
      personIds: z.array(z.string()).describe('List of person IDs to add or remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      action: z.string().describe('The action that was performed'),
      projectId: z.string().describe('The project ID'),
      personCount: z.number().describe('Number of people affected')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'add') {
      await client.addPeopleToProject(ctx.input.projectId, ctx.input.personIds);
      return {
        output: {
          success: true,
          action: 'add',
          projectId: ctx.input.projectId,
          personCount: ctx.input.personIds.length
        },
        message: `Added **${ctx.input.personIds.length}** person(s) to project ${ctx.input.projectId}.`
      };
    }

    await client.removePeopleFromProject(ctx.input.projectId, ctx.input.personIds);
    return {
      output: {
        success: true,
        action: 'remove',
        projectId: ctx.input.projectId,
        personCount: ctx.input.personIds.length
      },
      message: `Removed **${ctx.input.personIds.length}** person(s) from project ${ctx.input.projectId}.`
    };
  })
  .build();
