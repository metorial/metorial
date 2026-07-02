import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageMeetings = SlateTool.create(spec, {
  name: 'Manage Meetings',
  key: 'manage_meetings',
  description: `Create, update, or delete Meeting records in EspoCRM. Meetings can be associated with contacts, accounts, leads, and other entities.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      meetingId: z.string().optional().describe('Meeting ID (required for update and delete)'),
      name: z.string().optional().describe('Meeting subject'),
      status: z.string().optional().describe('Meeting status (e.g., Planned, Held, Not Held)'),
      dateStart: z.string().optional().describe('Start date/time (YYYY-MM-DD HH:mm:ss)'),
      dateEnd: z.string().optional().describe('End date/time (YYYY-MM-DD HH:mm:ss)'),
      duration: z.number().optional().describe('Duration in minutes'),
      parentType: z
        .string()
        .optional()
        .describe('Parent entity type (e.g., Account, Contact, Lead, Opportunity, Case)'),
      parentId: z.string().optional().describe('Parent record ID'),
      description: z.string().optional().describe('Meeting description'),
      assignedUserId: z.string().optional().describe('ID of the assigned user'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      meetingId: z.string().describe('ID of the meeting'),
      name: z.string().optional().describe('Meeting subject'),
      status: z.string().optional().describe('Meeting status'),
      dateStart: z.string().optional().describe('Start date/time'),
      dateEnd: z.string().optional().describe('End date/time'),
      parentType: z.string().optional().describe('Parent entity type'),
      parentId: z.string().optional().describe('Parent record ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, meetingId, customFields, ...fields } = ctx.input;

    if (action === 'create') {
      let data: Record<string, any> = { ...fields, ...customFields };
      let result = await client.createRecord('Meeting', data);
      return {
        output: {
          meetingId: result.id,
          name: result.name,
          status: result.status,
          dateStart: result.dateStart,
          dateEnd: result.dateEnd,
          parentType: result.parentType,
          parentId: result.parentId,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt
        },
        message: `Meeting **${result.name || ''}** created successfully.`
      };
    }

    if (action === 'update') {
      if (!meetingId) throw new Error('meetingId is required for update');
      let data: Record<string, any> = { ...fields, ...customFields };
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) delete data[key];
      });
      let result = await client.updateRecord('Meeting', meetingId, data);
      return {
        output: {
          meetingId: result.id,
          name: result.name,
          status: result.status,
          dateStart: result.dateStart,
          dateEnd: result.dateEnd,
          parentType: result.parentType,
          parentId: result.parentId,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt
        },
        message: `Meeting **${result.name || ''}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!meetingId) throw new Error('meetingId is required for delete');
      await client.deleteRecord('Meeting', meetingId);
      return {
        output: {
          meetingId
        },
        message: `Meeting **${meetingId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
