import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

let projectOutputSchema = z.object({
  projectId: z.number().describe('Project ID'),
  name: z.string().describe('Project name'),
  workspaceId: z.number().describe('Workspace ID'),
  clientId: z.number().nullable().describe('Associated client ID'),
  active: z.boolean().describe('Whether the project is active'),
  isPrivate: z.boolean().describe('Whether the project is private'),
  billable: z.boolean().nullable().describe('Whether the project is billable'),
  color: z.string().nullable().describe('Project color hex code'),
  estimatedHours: z.number().nullable().describe('Estimated hours for the project'),
  rate: z.number().nullable().describe('Hourly rate for the project'),
  currency: z.string().nullable().describe('Currency for billing'),
  createdAt: z.string().describe('Creation timestamp')
});

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, or delete a project in Toggl Track. Projects group time entries and can be assigned to clients, set as billable, and configured with hourly rates.
To **create**: provide a name. To **update**: provide a projectId and fields to change. To **delete**: provide a projectId and set \`delete\` to true.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Uses the configured default if not provided.'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID (required for update/delete, omit for create)'),
      delete: z.boolean().optional().describe('Set to true to delete the project'),
      name: z.string().optional().describe('Project name (required for create)'),
      clientId: z
        .number()
        .nullable()
        .optional()
        .describe('Client ID to associate (null to remove)'),
      isPrivate: z.boolean().optional().describe('Whether the project is private'),
      active: z.boolean().optional().describe('Whether the project is active'),
      color: z.string().optional().describe('Project color hex code (e.g., "#ff0000")'),
      billable: z.boolean().optional().describe('Whether the project is billable'),
      estimatedHours: z.number().optional().describe('Estimated hours'),
      rate: z.number().optional().describe('Hourly rate'),
      currency: z.string().optional().describe('Currency code (e.g., "USD")')
    })
  )
  .output(
    z.object({
      project: projectOutputSchema
        .nullable()
        .describe('The created/updated project, null if deleted'),
      deleted: z.boolean().describe('Whether a project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    if (ctx.input.delete && ctx.input.projectId) {
      await client.deleteProject(wsId, ctx.input.projectId);
      return {
        output: { project: null, deleted: true },
        message: `Deleted project **#${ctx.input.projectId}**`
      };
    }

    let project: any;
    if (ctx.input.projectId) {
      project = await client.updateProject(wsId, ctx.input.projectId, {
        name: ctx.input.name,
        clientId: ctx.input.clientId,
        isPrivate: ctx.input.isPrivate,
        active: ctx.input.active,
        color: ctx.input.color,
        billable: ctx.input.billable,
        estimatedHours: ctx.input.estimatedHours,
        rate: ctx.input.rate,
        currency: ctx.input.currency
      });
    } else {
      if (!ctx.input.name)
        throw new Error('Project name is required when creating a new project.');
      project = await client.createProject(wsId, {
        name: ctx.input.name,
        clientId: ctx.input.clientId ?? undefined,
        isPrivate: ctx.input.isPrivate,
        active: ctx.input.active,
        color: ctx.input.color,
        billable: ctx.input.billable,
        estimatedHours: ctx.input.estimatedHours,
        rate: ctx.input.rate,
        currency: ctx.input.currency
      });
    }

    let mapped = {
      projectId: project.id,
      name: project.name,
      workspaceId: project.workspace_id ?? project.wid,
      clientId: project.client_id ?? null,
      active: project.active ?? true,
      isPrivate: project.is_private ?? false,
      billable: project.billable ?? null,
      color: project.color ?? null,
      estimatedHours: project.estimated_hours ?? null,
      rate: project.rate ?? null,
      currency: project.currency ?? null,
      createdAt: project.created_at ?? project.at
    };

    return {
      output: { project: mapped, deleted: false },
      message: ctx.input.projectId
        ? `Updated project **${project.name}**`
        : `Created project **${project.name}**`
    };
  })
  .build();
