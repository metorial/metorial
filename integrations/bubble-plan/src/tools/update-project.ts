import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project in Project Bubble. Modify the name, description, dates, status, billing details, or team assignments. Only provided fields will be updated.`
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      projectName: z.string().optional().describe('New project name'),
      description: z.string().optional().describe('New project description'),
      tags: z.string().optional().describe('Comma-separated tags'),
      notes: z.string().optional().describe('Additional notes'),
      startDate: z.string().optional().describe('New start date (yyyymmdd format)'),
      dueDate: z.string().optional().describe('New due date (yyyymmdd format)'),
      clientId: z.string().optional().describe('Client ID to associate'),
      currency: z.string().optional().describe('Currency code for billing'),
      hourlyRate: z.number().optional().describe('Hourly rate for billing'),
      fixedPrice: z.number().optional().describe('Fixed price'),
      isPublic: z.boolean().optional().describe('Whether the project is public'),
      active: z.boolean().optional().describe('Whether the project is active'),
      important: z.boolean().optional().describe('Whether the project is important'),
      closed: z.boolean().optional().describe('Whether the project is closed'),
      archived: z.boolean().optional().describe('Whether the project is archived'),
      notifications: z.boolean().optional().describe('Whether notifications are enabled'),
      userIds: z.array(z.number()).optional().describe('Array of user IDs to assign'),
      teamIds: z.array(z.number()).optional().describe('Array of team IDs to assign')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the updated project'),
      projectName: z.string().describe('Name of the updated project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.updateProject(ctx.input.projectId, {
      projectName: ctx.input.projectName,
      description: ctx.input.description,
      tags: ctx.input.tags,
      notes: ctx.input.notes,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      clientId: ctx.input.clientId,
      currency: ctx.input.currency,
      hourlyRate: ctx.input.hourlyRate,
      fixedPrice: ctx.input.fixedPrice,
      public: ctx.input.isPublic,
      active: ctx.input.active,
      important: ctx.input.important,
      closed: ctx.input.closed,
      archived: ctx.input.archived,
      notifications: ctx.input.notifications,
      users: ctx.input.userIds,
      teams: ctx.input.teamIds
    });

    let p = result?.data?.[0] || result?.data || result;

    return {
      output: {
        projectId: String(p.project_id || ctx.input.projectId),
        projectName: p.project_name || ''
      },
      message: `Updated project **${p.project_name || ctx.input.projectId}**.`
    };
  })
  .build();
