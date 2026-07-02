import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAction = SlateTool.create(spec, {
  name: 'Create Action',
  key: 'create_action',
  description: `Create a new corrective action in SafetyCulture. Actions can be linked to inspections, assigned to users, and given priorities, due dates, and labels.`
})
  .input(
    z.object({
      title: z.string().describe('Title of the corrective action'),
      description: z.string().optional().describe('Detailed description of the action'),
      assigneeIds: z.array(z.string()).optional().describe('User IDs to assign the action to'),
      dueAt: z.string().optional().describe('Due date in ISO 8601 format'),
      priority: z
        .string()
        .optional()
        .describe('Priority level (e.g., "NONE", "LOW", "MEDIUM", "HIGH")'),
      siteId: z.string().optional().describe('Site ID to associate the action with'),
      inspectionId: z.string().optional().describe('Inspection ID to link the action to'),
      inspectionItemId: z
        .string()
        .optional()
        .describe('Specific inspection item ID to link the action to'),
      labelIds: z.array(z.string()).optional().describe('Action label IDs to apply')
    })
  )
  .output(
    z.object({
      actionId: z.string().describe('ID of the newly created action'),
      title: z.string().optional().describe('Title of the created action'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createAction({
      title: ctx.input.title,
      description: ctx.input.description,
      assigneeIds: ctx.input.assigneeIds,
      dueAt: ctx.input.dueAt,
      priority: ctx.input.priority,
      siteId: ctx.input.siteId,
      inspectionId: ctx.input.inspectionId,
      inspectionItemId: ctx.input.inspectionItemId,
      labels: ctx.input.labelIds
    });

    let actionId = result.task_id || result.id;

    return {
      output: {
        actionId,
        title: result.title || ctx.input.title,
        rawResponse: result
      },
      message: `Created action **${ctx.input.title}** (ID: ${actionId}).`
    };
  })
  .build();
