import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, or delete a project in Hub Planner. Use **action** to specify the operation.
When creating, only **name** is required. When updating, provide the **projectId** and any fields to change.
Projects can have statuses like Active, Archived, Planned, Pending, or Floating.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Operation to perform on the project'),
      projectId: z.string().optional().describe('Project ID, required for update and delete'),
      name: z.string().optional().describe('Project name, required for create'),
      projectCode: z.string().optional().describe('Unique project code'),
      status: z
        .enum([
          'STATUS_ACTIVE',
          'STATUS_ARCHIVED',
          'STATUS_PENDING',
          'STATUS_PLANNED',
          'STATUS_FLOATING'
        ])
        .optional()
        .describe('Project status'),
      note: z.string().optional().describe('Project notes'),
      start: z.string().optional().describe('Project start date (YYYY-MM-DD)'),
      end: z.string().optional().describe('Project end date (YYYY-MM-DD)'),
      useProjectDuration: z.boolean().optional().describe('Enable start/end display dates'),
      backgroundColor: z.string().optional().describe('Hex color code for the project'),
      budgetHours: z.number().optional().describe('Budget hours (0 to disable)'),
      budgetCashAmount: z.number().optional().describe('Budget cash amount (0 to disable)'),
      budgetCurrency: z.string().optional().describe('Budget currency code (e.g. USD, GBP)'),
      timeEntryEnabled: z
        .boolean()
        .optional()
        .describe('Enable time entries for this project'),
      timeEntryLocked: z.boolean().optional().describe('Lock time entries'),
      metadata: z.string().optional().describe('Custom metadata string (max 255 chars)')
    })
  )
  .output(
    z.object({
      projectId: z.string().optional().describe('ID of the project'),
      name: z.string().optional().describe('Project name'),
      projectCode: z.string().optional().describe('Project code'),
      status: z.string().optional().describe('Project status'),
      start: z.string().optional().describe('Start date'),
      end: z.string().optional().describe('End date'),
      createdDate: z.string().optional().describe('Creation timestamp'),
      updatedDate: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, projectId, ...fields } = ctx.input;

    if (action === 'create') {
      let result = await client.createProject(fields);
      return {
        output: {
          projectId: result._id,
          name: result.name,
          projectCode: result.projectCode,
          status: result.status,
          start: result.start,
          end: result.end,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Created project **${result.name}** (ID: \`${result._id}\`).`
      };
    }

    if (action === 'update') {
      if (!projectId) throw new Error('projectId is required for update');
      let result = await client.updateProject(projectId, fields);
      let project = Array.isArray(result) ? result[0] : result;
      return {
        output: {
          projectId: project._id,
          name: project.name,
          projectCode: project.projectCode,
          status: project.status,
          start: project.start,
          end: project.end,
          createdDate: project.createdDate,
          updatedDate: project.updatedDate
        },
        message: `Updated project **${project.name}** (ID: \`${project._id}\`).`
      };
    }

    if (!projectId) throw new Error('projectId is required for delete');
    await client.deleteProject(projectId);
    return {
      output: { projectId },
      message: `Deleted project \`${projectId}\`.`
    };
  })
  .build();
