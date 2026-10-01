import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { createClient } from '../lib/helpers';

export let manageTimeEntry = SlateTool.create(spec, {
  name: 'Desk Manage Time Entry',
  key: 'desk_manage_time_entry',
  description: `Create, update, or retrieve a time entry against a ticket. Time entries track hours spent on tickets and can include cost data. Specify a timeEntryId to update/retrieve, or a ticketId to create a new entry.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      orgId: z
        .string()
        .optional()
        .describe('Organization ID. Call desk_list_organizations to discover IDs.'),
      timeEntryId: z
        .string()
        .optional()
        .describe('Existing time entry ID to update or retrieve'),
      ticketId: z.string().optional().describe('Ticket ID to create a new time entry for'),
      agentId: z.string().optional().describe('Agent ID who performed the work'),
      executedTime: z.string().optional().describe('Timestamp when work started (ISO 8601)'),
      description: z.string().optional().describe('Description of the work performed'),
      hoursSpent: z.number().int().min(0).max(999).optional(),
      minutesSpent: z.number().int().min(0).optional(),
      secondsSpent: z.number().int().min(0).optional(),
      agentCostPerHour: z.string().optional().describe('Cost per hour for the agent'),
      additionalCost: z.string().optional().describe('Additional costs'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string().describe('ID of the time entry'),
      ticketId: z.string().optional().describe('Associated ticket ID'),
      agentId: z.string().optional().describe('Agent ID'),
      executedTime: z.string().optional().describe('Time spent'),
      description: z.string().optional().describe('Description'),
      createdTime: z.string().optional().describe('Creation time')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { timeEntryId, ticketId, customFields, orgId: _orgId, ...fields } = ctx.input;

    let entryData: Record<string, any> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) entryData[key] = value;
    }
    if (customFields) entryData.cf = customFields;

    if (!ticketId)
      throw createApiServiceError('ticketId is required for ticket time entry operations');
    if (entryData.agentId) {
      entryData.ownerId = entryData.agentId;
      entryData.agentId = undefined;
    }
    let result: any;
    let action: string;

    if (timeEntryId && Object.keys(entryData).length > 0) {
      result = await client.updateTimeEntry(ticketId, timeEntryId, entryData);
      action = 'Updated';
    } else if (timeEntryId) {
      result = await client.getTimeEntry(ticketId, timeEntryId);
      action = 'Retrieved';
    } else if (ticketId) {
      if (!entryData.executedTime)
        throw createApiServiceError('executedTime is required when creating a time entry');
      result = await client.createTimeEntry(ticketId, entryData);
      action = 'Created';
    } else {
      throw createApiServiceError(
        'Either timeEntryId (to update/retrieve) or ticketId (to create) must be provided'
      );
    }

    return {
      output: {
        timeEntryId: result.id,
        ticketId: result.parent?.id || ticketId,
        agentId: result.ownerId,
        executedTime: result.executedTime,
        description: result.description,
        createdTime: result.createdTime
      },
      message: `${action} time entry **${result.id}** (${result.executedTime || 'N/A'})`
    };
  })
  .build();
