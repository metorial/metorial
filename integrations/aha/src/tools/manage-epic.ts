import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

let epicOutputSchema = z.object({
  epicId: z.string().optional().describe('Epic ID'),
  referenceNum: z.string().optional().describe('Epic reference number'),
  name: z.string().optional().describe('Epic name'),
  description: z.string().optional().describe('Epic description (HTML)'),
  status: z.string().optional().describe('Workflow status name'),
  assignee: z.string().optional().describe('Assigned user name'),
  tags: z.array(z.string()).optional().describe('Tags'),
  progress: z.number().optional().describe('Progress percentage'),
  url: z.string().optional().describe('Aha! URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deleted: z.boolean().optional().describe('True if the epic was deleted')
});

export let manageEpic = SlateTool.create(spec, {
  name: 'Manage Epic',
  key: 'manage_epic',
  description: `Create, update, or delete an epic in Aha!. Epics are large bodies of work that group multiple features together. They belong to a product and can span multiple releases.`,
  instructions: [
    'To **create** an epic, set action to "create" and provide a productId plus at least a name.',
    'To **update** an epic, set action to "update" and provide the epicId plus the fields to change.',
    'To **delete** an epic, set action to "delete" and provide the epicId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      epicId: z
        .string()
        .optional()
        .describe('Epic ID or reference number (required for update/delete)'),
      productId: z
        .string()
        .optional()
        .describe('Product ID or reference prefix (required for create)'),
      name: z.string().optional().describe('Epic name'),
      description: z.string().optional().describe('Epic description (HTML supported)'),
      assignedToUser: z.string().optional().describe('Email address of the user to assign'),
      tags: z.array(z.string()).optional().describe('Tags to set'),
      workflowStatus: z.string().optional().describe('Workflow status name')
    })
  )
  .output(epicOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.productId) throw new Error('productId is required to create an epic');
      if (!ctx.input.name) throw new Error('name is required to create an epic');

      let epic = await client.createEpic(ctx.input.productId, {
        name: ctx.input.name,
        description: ctx.input.description,
        assignedToUser: ctx.input.assignedToUser,
        tags: ctx.input.tags,
        workflowStatus: ctx.input.workflowStatus
      });

      return {
        output: {
          epicId: epic.id,
          referenceNum: epic.reference_num,
          name: epic.name,
          description: epic.description,
          status: epic.workflow_status?.name,
          assignee: epic.assigned_to_user?.name,
          tags: epic.tags,
          progress: epic.progress,
          url: epic.url,
          createdAt: epic.created_at,
          updatedAt: epic.updated_at
        },
        message: `Created epic **${epic.reference_num}** — ${epic.name}.`
      };
    }

    if (!ctx.input.epicId) throw new Error('epicId is required for this action');

    if (action === 'delete') {
      await client.deleteEpic(ctx.input.epicId);
      return {
        output: { epicId: ctx.input.epicId, deleted: true },
        message: `Deleted epic \`${ctx.input.epicId}\`.`
      };
    }

    // update
    let epic = await client.updateEpic(ctx.input.epicId, {
      name: ctx.input.name,
      description: ctx.input.description,
      assignedToUser: ctx.input.assignedToUser,
      tags: ctx.input.tags,
      workflowStatus: ctx.input.workflowStatus
    });

    return {
      output: {
        epicId: epic.id,
        referenceNum: epic.reference_num,
        name: epic.name,
        description: epic.description,
        status: epic.workflow_status?.name,
        assignee: epic.assigned_to_user?.name,
        tags: epic.tags,
        progress: epic.progress,
        url: epic.url,
        createdAt: epic.created_at,
        updatedAt: epic.updated_at
      },
      message: `Updated epic **${epic.reference_num}** — ${epic.name}.`
    };
  })
  .build();
