import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTimeEntry = SlateTool.create(spec, {
  name: 'Manage Time Entry',
  key: 'manage_time_entry',
  description: `Create, update, or retrieve a time entry against a ticket. Time entries track hours spent on tickets and can include cost data. Specify a timeEntryId to update/retrieve, or a ticketId to create a new entry.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      timeEntryId: z
        .string()
        .optional()
        .describe('Existing time entry ID to update or retrieve'),
      ticketId: z.string().optional().describe('Ticket ID to create a new time entry for'),
      agentId: z.string().optional().describe('Agent ID who performed the work'),
      executedTime: z.string().optional().describe('Time spent (format: HH:mm)'),
      description: z.string().optional().describe('Description of the work performed'),
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
    let { timeEntryId, ticketId, customFields, ...fields } = ctx.input;

    let entryData: Record<string, any> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) entryData[key] = value;
    }
    if (customFields) entryData.cf = customFields;

    let result: any;
    let action: string;

    if (timeEntryId && Object.keys(entryData).length > 0) {
      result = await client.updateTimeEntry(timeEntryId, entryData);
      action = 'Updated';
    } else if (timeEntryId) {
      result = await client.getTimeEntry(timeEntryId);
      action = 'Retrieved';
    } else if (ticketId) {
      result = await client.createTimeEntry(ticketId, entryData);
      action = 'Created';
    } else {
      throw new Error(
        'Either timeEntryId (to update/retrieve) or ticketId (to create) must be provided'
      );
    }

    return {
      output: {
        timeEntryId: result.id,
        ticketId: result.ticketId,
        agentId: result.agentId,
        executedTime: result.executedTime,
        description: result.description,
        createdTime: result.createdTime
      },
      message: `${action} time entry **${result.id}** (${result.executedTime || 'N/A'})`
    };
  })
  .build();
