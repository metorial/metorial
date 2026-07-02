import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let timeEntryOutputSchema = z.object({
  timeEntryId: z.number().describe('Unique identifier of the time entry'),
  start: z.string().describe('Start time of the entry (ISO 8601 format)'),
  end: z.string().describe('End time of the entry (ISO 8601 format)'),
  description: z.string().optional().describe('Description of the work performed'),
  clientId: z.number().optional().describe('ID of the associated client'),
  projectId: z.number().optional().describe('ID of the associated project'),
  serviceId: z.number().optional().describe('ID of the associated service'),
  userId: z.number().optional().describe('ID of the user who created the entry'),
  paid: z.boolean().optional().describe('Whether the time entry has been paid'),
  billable: z.boolean().optional().describe('Whether the time entry is billable'),
  externalId: z.string().optional().describe('External ID for syncing with other systems')
});

export let searchTimeEntriesTool = SlateTool.create(spec, {
  name: 'Search Time Entries',
  key: 'search_time_entries',
  description: `Search and filter time entries in Timelink. Filter by date range, client, project, service, or external ID. Returns all matching time entries with their full details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      after: z
        .string()
        .optional()
        .describe('Return entries after this date/time (ISO 8601 format)'),
      before: z
        .string()
        .optional()
        .describe('Return entries before this date/time (ISO 8601 format)'),
      clientId: z.number().optional().describe('Filter by client ID'),
      projectId: z.number().optional().describe('Filter by project ID'),
      serviceId: z.number().optional().describe('Filter by service ID'),
      externalId: z.string().optional().describe('Filter by external ID')
    })
  )
  .output(
    z.object({
      timeEntries: z.array(timeEntryOutputSchema).describe('List of matching time entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let entries = await client.listTimeEntries(ctx.input);

    let mapped = entries.map(e => ({
      timeEntryId: e.id,
      start: e.start,
      end: e.end,
      description: e.description,
      clientId: e.clientId ?? e.client_id,
      projectId: e.projectId ?? e.project_id,
      serviceId: e.serviceId ?? e.service_id,
      userId: e.userId ?? e.user_id,
      paid: e.paid,
      billable: e.billable,
      externalId: e.externalId ?? e.external_id
    }));

    return {
      output: { timeEntries: mapped },
      message: `Found **${mapped.length}** time entr${mapped.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();

export let getTimeEntryTool = SlateTool.create(spec, {
  name: 'Get Time Entry',
  key: 'get_time_entry',
  description: `Retrieve a specific time entry by ID. Returns full details including start/end times, associated client, project, service, and billing information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      timeEntryId: z.number().describe('ID of the time entry to retrieve')
    })
  )
  .output(timeEntryOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let e = await client.getTimeEntry(ctx.input.timeEntryId);

    return {
      output: {
        timeEntryId: e.id,
        start: e.start,
        end: e.end,
        description: e.description,
        clientId: e.clientId ?? e.client_id,
        projectId: e.projectId ?? e.project_id,
        serviceId: e.serviceId ?? e.service_id,
        userId: e.userId ?? e.user_id,
        paid: e.paid,
        billable: e.billable,
        externalId: e.externalId ?? e.external_id
      },
      message: `Retrieved time entry **#${e.id}** (${e.start} - ${e.end}).`
    };
  })
  .build();

export let createTimeEntryTool = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Create a new time entry in Timelink. Requires start and end times. Optionally assign to a client, project, service, and user, and set billing and payment status.`,
  instructions: [
    'Start and end times should be in ISO 8601 format (e.g., "2024-01-15T09:00:00Z").',
    'Use the List Clients, List Projects, and List Services tools to find valid IDs before creating a time entry.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      start: z.string().describe('Start time (ISO 8601 format, e.g., "2024-01-15T09:00:00Z")'),
      end: z.string().describe('End time (ISO 8601 format, e.g., "2024-01-15T17:00:00Z")'),
      description: z.string().optional().describe('Description of the work performed'),
      clientId: z.number().optional().describe('ID of the client to associate with'),
      projectId: z.number().optional().describe('ID of the project to associate with'),
      serviceId: z.number().optional().describe('ID of the service/activity type'),
      userId: z
        .number()
        .optional()
        .describe('ID of the user (defaults to authenticated user)'),
      paid: z.boolean().optional().describe('Whether the time entry has been paid'),
      billable: z.boolean().optional().describe('Whether the time entry is billable'),
      externalId: z.string().optional().describe('External ID for syncing with other systems')
    })
  )
  .output(timeEntryOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let e = await client.createTimeEntry(ctx.input);

    return {
      output: {
        timeEntryId: e.id,
        start: e.start,
        end: e.end,
        description: e.description,
        clientId: e.clientId ?? e.client_id,
        projectId: e.projectId ?? e.project_id,
        serviceId: e.serviceId ?? e.service_id,
        userId: e.userId ?? e.user_id,
        paid: e.paid,
        billable: e.billable,
        externalId: e.externalId ?? e.external_id
      },
      message: `Created time entry **#${e.id}** (${e.start} - ${e.end}).`
    };
  })
  .build();

export let updateTimeEntryTool = SlateTool.create(spec, {
  name: 'Update Time Entry',
  key: 'update_time_entry',
  description: `Update an existing time entry in Timelink. Only the provided fields will be updated; omitted fields remain unchanged. Can modify times, description, assignments, and billing status.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      timeEntryId: z.number().describe('ID of the time entry to update'),
      start: z.string().optional().describe('New start time (ISO 8601 format)'),
      end: z.string().optional().describe('New end time (ISO 8601 format)'),
      description: z.string().optional().describe('New description of the work performed'),
      clientId: z.number().optional().describe('ID of the client to associate with'),
      projectId: z.number().optional().describe('ID of the project to associate with'),
      serviceId: z.number().optional().describe('ID of the service/activity type'),
      userId: z.number().optional().describe('ID of the user'),
      paid: z.boolean().optional().describe('Whether the time entry has been paid'),
      billable: z.boolean().optional().describe('Whether the time entry is billable'),
      externalId: z.string().optional().describe('External ID for syncing with other systems')
    })
  )
  .output(timeEntryOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { timeEntryId, ...updateData } = ctx.input;
    let e = await client.updateTimeEntry(timeEntryId, updateData);

    return {
      output: {
        timeEntryId: e.id,
        start: e.start,
        end: e.end,
        description: e.description,
        clientId: e.clientId ?? e.client_id,
        projectId: e.projectId ?? e.project_id,
        serviceId: e.serviceId ?? e.service_id,
        userId: e.userId ?? e.user_id,
        paid: e.paid,
        billable: e.billable,
        externalId: e.externalId ?? e.external_id
      },
      message: `Updated time entry **#${e.id}** (${e.start} - ${e.end}).`
    };
  })
  .build();

export let deleteTimeEntryTool = SlateTool.create(spec, {
  name: 'Delete Time Entry',
  key: 'delete_time_entry',
  description: `Permanently delete a time entry from Timelink. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      timeEntryId: z.number().describe('ID of the time entry to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful'),
      timeEntryId: z.number().describe('ID of the deleted time entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTimeEntry(ctx.input.timeEntryId);

    return {
      output: {
        deleted: true,
        timeEntryId: ctx.input.timeEntryId
      },
      message: `Deleted time entry **#${ctx.input.timeEntryId}**.`
    };
  })
  .build();
