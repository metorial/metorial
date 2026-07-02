import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let manageProjects = SlateTool.create(spec, {
  name: 'Manage Projects',
  key: 'manage_projects',
  description: `Create, update, or delete projects in FreshBooks. Projects are associated with clients and can be either fixed-price or hourly-rate. Time entries can be logged against projects. Requires a **businessId** in the configuration.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      projectId: z.number().optional().describe('Project ID (required for update/delete)'),
      title: z.string().optional().describe('Project title (required for create)'),
      clientId: z.number().optional().describe('Client ID (required for create)'),
      projectType: z
        .enum(['fixed_price', 'hourly_rate'])
        .optional()
        .describe('Project billing type (required for create)'),
      fixedPrice: z
        .string()
        .optional()
        .describe('Fixed price amount (for fixed_price projects)'),
      rate: z.string().optional().describe('Hourly rate (for hourly_rate projects)'),
      description: z.string().optional().describe('Project description'),
      dueDate: z.string().optional().describe('Project due date (YYYY-MM-DD)'),
      complete: z.boolean().optional().describe('Whether the project is complete')
    })
  )
  .output(
    z.object({
      projectId: z.number(),
      title: z.string().nullable().optional(),
      clientId: z.number().nullable().optional(),
      projectType: z.string().nullable().optional(),
      fixedPrice: z.string().nullable().optional(),
      rate: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      complete: z.boolean().nullable().optional(),
      active: z.boolean().nullable().optional(),
      loggedDuration: z.number().nullable().optional().describe('Total logged time in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let buildPayload = () => {
      let payload: Record<string, any> = {};
      if (ctx.input.title !== undefined) payload.title = ctx.input.title;
      if (ctx.input.clientId !== undefined) payload.client_id = ctx.input.clientId;
      if (ctx.input.projectType !== undefined) payload.project_type = ctx.input.projectType;
      if (ctx.input.fixedPrice !== undefined) payload.fixed_price = ctx.input.fixedPrice;
      if (ctx.input.rate !== undefined) payload.rate = ctx.input.rate;
      if (ctx.input.description !== undefined) payload.description = ctx.input.description;
      if (ctx.input.dueDate !== undefined) payload.due_date = ctx.input.dueDate;
      if (ctx.input.complete !== undefined) payload.complete = ctx.input.complete;
      return payload;
    };

    let mapResult = (raw: any) => ({
      projectId: raw.id,
      title: raw.title,
      clientId: raw.client_id,
      projectType: raw.project_type,
      fixedPrice: raw.fixed_price,
      rate: raw.rate,
      description: raw.description,
      dueDate: raw.due_date,
      complete: raw.complete,
      active: raw.active,
      loggedDuration: raw.logged_duration
    });

    if (ctx.input.action === 'create') {
      let result = await client.createProject(buildPayload());
      return {
        output: mapResult(result),
        message: `Created project **${result.title}** (ID: ${result.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.projectId) throw new Error('projectId is required for update');
      let result = await client.updateProject(ctx.input.projectId, buildPayload());
      return {
        output: mapResult(result),
        message: `Updated project **${result.title}** (ID: ${ctx.input.projectId}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.projectId) throw new Error('projectId is required for delete');
      await client.deleteProject(ctx.input.projectId);
      return {
        output: {
          projectId: ctx.input.projectId
        },
        message: `Deleted project (ID: ${ctx.input.projectId}).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
