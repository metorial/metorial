import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageCalls = SlateTool.create(spec, {
  name: 'Manage Calls',
  key: 'manage_calls',
  description: `Create, update, or delete Call records in EspoCRM. Calls log phone interactions and can be associated with contacts, accounts, leads, and other entities.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      callId: z.string().optional().describe('Call ID (required for update and delete)'),
      name: z.string().optional().describe('Call subject'),
      status: z.string().optional().describe('Call status (e.g., Planned, Held, Not Held)'),
      direction: z.enum(['Outbound', 'Inbound']).optional().describe('Call direction'),
      dateStart: z.string().optional().describe('Start date/time (YYYY-MM-DD HH:mm:ss)'),
      dateEnd: z.string().optional().describe('End date/time (YYYY-MM-DD HH:mm:ss)'),
      duration: z.number().optional().describe('Duration in minutes'),
      parentType: z
        .string()
        .optional()
        .describe('Parent entity type (e.g., Account, Contact, Lead)'),
      parentId: z.string().optional().describe('Parent record ID'),
      description: z.string().optional().describe('Call description or notes'),
      assignedUserId: z.string().optional().describe('ID of the assigned user'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('ID of the call'),
      name: z.string().optional().describe('Call subject'),
      status: z.string().optional().describe('Call status'),
      direction: z.string().optional().describe('Call direction'),
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
    let { action, callId, customFields, ...fields } = ctx.input;
    if (fields.duration !== undefined) fields.duration *= 60;

    if (action === 'create') {
      let data: Record<string, any> = { ...fields, ...customFields };
      let result = await client.createRecord('Call', data);
      return {
        output: {
          callId: result.id,
          name: result.name ?? undefined,
          status: result.status ?? undefined,
          direction: result.direction ?? undefined,
          dateStart: result.dateStart ?? undefined,
          dateEnd: result.dateEnd ?? undefined,
          parentType: result.parentType ?? undefined,
          parentId: result.parentId ?? undefined,
          createdAt: result.createdAt ?? undefined,
          modifiedAt: result.modifiedAt ?? undefined
        },
        message: `Call **${result.name || ''}** created successfully.`
      };
    }

    if (action === 'update') {
      if (!callId) throw createApiServiceError('callId is required for update');
      let data: Record<string, any> = { ...fields, ...customFields };
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) delete data[key];
      });
      let result = await client.updateRecord('Call', callId, data);
      return {
        output: {
          callId: result.id,
          name: result.name ?? undefined,
          status: result.status ?? undefined,
          direction: result.direction ?? undefined,
          dateStart: result.dateStart ?? undefined,
          dateEnd: result.dateEnd ?? undefined,
          parentType: result.parentType ?? undefined,
          parentId: result.parentId ?? undefined,
          createdAt: result.createdAt ?? undefined,
          modifiedAt: result.modifiedAt ?? undefined
        },
        message: `Call **${result.name || ''}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!callId) throw createApiServiceError('callId is required for delete');
      await client.deleteRecord('Call', callId);
      return {
        output: {
          callId
        },
        message: `Call **${callId}** deleted successfully.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
