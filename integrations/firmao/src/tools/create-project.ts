import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Firmao. Projects can include team members, managers, tags, budgets, and date ranges. Tasks can be organized within projects.`
})
  .input(
    z.object({
      name: z.string().describe('Project name'),
      description: z.string().optional().describe('Project description'),
      startDate: z.string().optional().describe('Start date in ISO 8601 format'),
      endDate: z.string().optional().describe('End date in ISO 8601 format'),
      teamMemberIds: z.array(z.number()).optional().describe('IDs of team member users'),
      managerIds: z.array(z.number()).optional().describe('IDs of manager users'),
      tagIds: z.array(z.number()).optional().describe('IDs of tags to apply'),
      budget: z.number().optional().describe('Project budget')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the created project'),
      name: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.startDate) body.startDate = ctx.input.startDate;
    if (ctx.input.endDate) body.endDate = ctx.input.endDate;
    if (ctx.input.teamMemberIds)
      body.teamMembers = ctx.input.teamMemberIds.map(id => ({ id }));
    if (ctx.input.managerIds) body.managers = ctx.input.managerIds.map(id => ({ id }));
    if (ctx.input.tagIds) body.tags = ctx.input.tagIds.map(id => ({ id }));
    if (ctx.input.budget !== undefined) body.budget = ctx.input.budget;

    let result = await client.create('projects', body);
    let createdId = result?.changelog?.[0]?.objectId ?? result?.id;

    return {
      output: {
        projectId: createdId,
        name: ctx.input.name
      },
      message: `Created project **${ctx.input.name}** (ID: ${createdId}).`
    };
  })
  .build();
