import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project in Firmao. Only provided fields will be modified.`
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to update'),
      name: z.string().optional().describe('Updated project name'),
      description: z.string().optional().describe('Updated description'),
      startDate: z.string().optional().describe('Updated start date (ISO 8601)'),
      endDate: z.string().optional().describe('Updated end date (ISO 8601)'),
      teamMemberIds: z.array(z.number()).optional().describe('Updated team member user IDs'),
      managerIds: z.array(z.number()).optional().describe('Updated manager user IDs'),
      budget: z.number().optional().describe('Updated budget')
    })
  )
  .output(
    z.object({
      projectId: z.number(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {};

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.startDate) body.startDate = ctx.input.startDate;
    if (ctx.input.endDate) body.endDate = ctx.input.endDate;
    if (ctx.input.teamMemberIds)
      body.teamMembers = ctx.input.teamMemberIds.map(id => ({ id }));
    if (ctx.input.managerIds) body.managers = ctx.input.managerIds.map(id => ({ id }));
    if (ctx.input.budget !== undefined) body.budget = ctx.input.budget;

    await client.update('projects', ctx.input.projectId, body);

    return {
      output: {
        projectId: ctx.input.projectId,
        updated: true
      },
      message: `Updated project ID **${ctx.input.projectId}**.`
    };
  })
  .build();
