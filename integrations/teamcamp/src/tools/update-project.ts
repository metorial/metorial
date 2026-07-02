import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project's properties such as name, description, dates, customer association, and feature toggles (priority, estimates, milestones). Only provided fields are updated.`
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      projectName: z.string().optional().describe('New project name'),
      description: z.string().optional().describe('New project description'),
      customerId: z.string().optional().describe('ID of the customer to associate'),
      startDate: z.string().optional().describe('New start date in yyyy-MM-dd format'),
      dueDate: z.string().optional().describe('New due date in yyyy-MM-dd format'),
      priorityEnabled: z
        .boolean()
        .optional()
        .describe('Enable or disable task prioritization for this project'),
      defaultPriority: z
        .enum(['No Priority', 'Urgent', 'High', 'Medium', 'Low'])
        .optional()
        .describe('Default priority for new tasks when prioritization is enabled'),
      estimateEnabled: z
        .boolean()
        .optional()
        .describe('Enable or disable time estimation for tasks'),
      milestoneEnabled: z.boolean().optional().describe('Enable or disable milestone tracking')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the updated project'),
      projectName: z.string().describe('Name of the updated project'),
      workspaceId: z.string().optional().describe('ID of the workspace'),
      ownerId: z.string().optional().describe('ID of the project owner'),
      description: z.string().optional().describe('Project description'),
      customerId: z.string().optional().describe('ID of the associated customer'),
      startDate: z.string().optional().describe('Project start date'),
      dueDate: z.string().optional().describe('Project due date'),
      favoriteUsers: z
        .array(z.string())
        .optional()
        .describe('IDs of users who favorited this project'),
      projectUsers: z
        .array(z.string())
        .optional()
        .describe('IDs of users assigned to this project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateData: Record<string, any> = {};
    if (ctx.input.projectName !== undefined) updateData.projectName = ctx.input.projectName;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
    if (ctx.input.customerId !== undefined) updateData.customerId = ctx.input.customerId;
    if (ctx.input.startDate !== undefined) updateData.startDate = ctx.input.startDate;
    if (ctx.input.dueDate !== undefined) updateData.dueDate = ctx.input.dueDate;
    if (ctx.input.priorityEnabled !== undefined)
      updateData.priority = ctx.input.priorityEnabled;
    if (ctx.input.defaultPriority !== undefined)
      updateData.defaultPriority = ctx.input.defaultPriority;
    if (ctx.input.estimateEnabled !== undefined)
      updateData.estimate = ctx.input.estimateEnabled;
    if (ctx.input.milestoneEnabled !== undefined)
      updateData.milestone = ctx.input.milestoneEnabled;

    let project = await client.updateProject(ctx.input.projectId, updateData);

    return {
      output: {
        projectId: project.projectId ?? '',
        projectName: project.projectName ?? '',
        workspaceId: project.workspaceId || undefined,
        ownerId: project.ownerId || undefined,
        description: project.description || undefined,
        customerId: project.customerId || undefined,
        startDate: project.startDate || undefined,
        dueDate: project.dueDate || undefined,
        favoriteUsers: Array.isArray(project.favoriteUsers)
          ? project.favoriteUsers
          : undefined,
        projectUsers: Array.isArray(project.projectUsers) ? project.projectUsers : undefined
      },
      message: `Updated project **${project.projectName}** (ID: ${project.projectId}).`
    };
  })
  .build();
