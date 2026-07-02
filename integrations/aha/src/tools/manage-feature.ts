import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

let featureOutputSchema = z.object({
  featureId: z.string().optional().describe('Feature ID'),
  referenceNum: z.string().optional().describe('Feature reference number (e.g. APP-123)'),
  name: z.string().optional().describe('Feature name'),
  description: z.string().optional().describe('Feature description (HTML)'),
  status: z.string().optional().describe('Workflow status name'),
  assignee: z.string().optional().describe('Assigned user name'),
  startDate: z.string().optional().describe('Start date'),
  dueDate: z.string().optional().describe('Due date'),
  tags: z.array(z.string()).optional().describe('Tags'),
  url: z.string().optional().describe('Aha! URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deleted: z.boolean().optional().describe('True if the feature was deleted')
});

export let manageFeature = SlateTool.create(spec, {
  name: 'Manage Feature',
  key: 'manage_feature',
  description: `Create, update, or delete a feature in Aha!. Features are the core work items that belong to releases. You can set name, description, assignee, dates, tags, and workflow status.`,
  instructions: [
    'To **create** a feature, set action to "create" and provide a releaseId plus at least a name.',
    'To **update** a feature, set action to "update" and provide the featureId plus the fields to change.',
    'To **delete** a feature, set action to "delete" and provide the featureId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      featureId: z
        .string()
        .optional()
        .describe('Feature ID or reference number (required for update/delete)'),
      releaseId: z
        .string()
        .optional()
        .describe('Release ID or reference number (required for create)'),
      name: z.string().optional().describe('Feature name'),
      description: z.string().optional().describe('Feature description (HTML supported)'),
      assignedToUser: z.string().optional().describe('Email address of the user to assign'),
      tags: z.array(z.string()).optional().describe('Tags to set'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      workflowStatus: z.string().optional().describe('Workflow status name')
    })
  )
  .output(featureOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.releaseId) throw new Error('releaseId is required to create a feature');
      if (!ctx.input.name) throw new Error('name is required to create a feature');

      let feature = await client.createFeature(ctx.input.releaseId, {
        name: ctx.input.name,
        description: ctx.input.description,
        assignedToUser: ctx.input.assignedToUser,
        tags: ctx.input.tags,
        startDate: ctx.input.startDate,
        dueDate: ctx.input.dueDate,
        workflowStatus: ctx.input.workflowStatus
      });

      return {
        output: {
          featureId: feature.id,
          referenceNum: feature.reference_num,
          name: feature.name,
          description: feature.description,
          status: feature.workflow_status?.name,
          assignee: feature.assigned_to_user?.name,
          startDate: feature.start_date,
          dueDate: feature.due_date,
          tags: feature.tags,
          url: feature.url,
          createdAt: feature.created_at,
          updatedAt: feature.updated_at
        },
        message: `Created feature **${feature.reference_num}** — ${feature.name}.`
      };
    }

    if (!ctx.input.featureId) throw new Error('featureId is required for this action');

    if (action === 'delete') {
      await client.deleteFeature(ctx.input.featureId);
      return {
        output: { featureId: ctx.input.featureId, deleted: true },
        message: `Deleted feature \`${ctx.input.featureId}\`.`
      };
    }

    // update
    let feature = await client.updateFeature(ctx.input.featureId, {
      name: ctx.input.name,
      description: ctx.input.description,
      assignedToUser: ctx.input.assignedToUser,
      tags: ctx.input.tags,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      workflowStatus: ctx.input.workflowStatus
    });

    return {
      output: {
        featureId: feature.id,
        referenceNum: feature.reference_num,
        name: feature.name,
        description: feature.description,
        status: feature.workflow_status?.name,
        assignee: feature.assigned_to_user?.name,
        startDate: feature.start_date,
        dueDate: feature.due_date,
        tags: feature.tags,
        url: feature.url,
        createdAt: feature.created_at,
        updatedAt: feature.updated_at
      },
      message: `Updated feature **${feature.reference_num}** — ${feature.name}.`
    };
  })
  .build();
