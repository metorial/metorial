import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Project Bubble. A project serves as the top-level container for tasks, files, and collaboration. You can set dates, assign users/teams, configure billing, and more.`
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the new project'),
      description: z.string().optional().describe('Project description'),
      tags: z.string().optional().describe('Comma-separated tags for the project'),
      notes: z.string().optional().describe('Additional notes for the project'),
      startDate: z.string().optional().describe('Project start date (yyyymmdd format)'),
      dueDate: z.string().optional().describe('Project due date (yyyymmdd format)'),
      clientId: z.string().optional().describe('Client ID to associate with the project'),
      currency: z.string().optional().describe('Currency code for billing'),
      hourlyRate: z.number().optional().describe('Hourly rate for billing'),
      fixedPrice: z.number().optional().describe('Fixed price for the project'),
      isPublic: z.boolean().optional().describe('Whether the project is public'),
      active: z.boolean().optional().describe('Whether the project is active'),
      important: z.boolean().optional().describe('Whether the project is marked as important'),
      notifications: z.boolean().optional().describe('Whether notifications are enabled'),
      userIds: z.array(z.number()).optional().describe('Array of user IDs to assign'),
      teamIds: z.array(z.number()).optional().describe('Array of team IDs to assign')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the created project'),
      projectName: z.string().describe('Name of the created project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.createProject({
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
      notifications: ctx.input.notifications,
      users: ctx.input.userIds,
      teams: ctx.input.teamIds
    });

    let p = result?.data?.[0] || result?.data || result;

    return {
      output: {
        projectId: String(p.project_id),
        projectName: p.project_name || ctx.input.projectName
      },
      message: `Created project **${p.project_name || ctx.input.projectName}**.`
    };
  })
  .build();
