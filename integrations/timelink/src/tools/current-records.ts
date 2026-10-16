import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { type ApiRecord, CurrentClient, type MutableResource } from '../lib/current-client';
import { spec } from '../spec';

const recordSchema = z.record(z.string(), z.unknown());
const recordOutput = z.object({
  record: recordSchema.describe(
    'Provider record with original field names, string IDs, and nullable values'
  )
});
const pageOutput = z.object({
  records: z
    .array(recordSchema)
    .describe('Records on the returned page, preserving provider fields'),
  pagination: recordSchema.optional().describe('Pagination metadata supplied by Timelink'),
  count: z.number().describe('Number of records on this returned page')
});
const resourceSchema = z.enum(['clients', 'projects', 'services', 'users', 'timeEntries']);
const idSchema = z
  .string()
  .describe('Timelink string ID. Call list_records to discover authorized IDs.');
const actionSchema = z.enum(['create', 'update', 'delete']);
const optionalText = z.string().nullable().optional();
const optionalFlag = z.boolean().nullable().optional();
const commonFields = {
  action: actionSchema,
  id: idSchema
    .optional()
    .describe('Required for update or delete; discover IDs with list_records.'),
  name: z.string().optional().describe('Required when creating a client, project, or service'),
  info: optionalText.describe('Additional information; null clears it'),
  color: optionalText.describe('Provider color value; null clears it'),
  acronym: optionalText.describe('Short acronym; null clears it'),
  active: optionalFlag.describe('Whether the record is active'),
  billable: optionalFlag.describe('Whether the record is billable'),
  externalId: optionalText.describe('External system ID, sent as ext_tool_id; null clears it')
};

const requireText = (value: string | undefined, field: string): string => {
  if (value === undefined || !value.trim()) throw createApiServiceError(`Provide ${field}.`);
  return value;
};
const validateDate = (value: string | null | undefined, field: string) => {
  if (
    value !== undefined &&
    value !== null &&
    (!value.trim() || !Number.isFinite(Date.parse(value)))
  ) {
    throw createApiServiceError(`${field} must be a valid date/time.`);
  }
};

const mutate = async (
  client: CurrentClient,
  resource: MutableResource,
  action: 'create' | 'update' | 'delete',
  id: string | undefined,
  data: ApiRecord
) => {
  const hasFields = Object.values(data).some(value => value !== undefined);
  if (action === 'create') {
    if (id !== undefined) throw createApiServiceError('Omit id when creating a record.');
    return client.createRecord(resource, data);
  }
  const recordId = requireText(id, 'id for update or delete');
  if (action === 'delete') {
    if (hasFields)
      throw createApiServiceError('Delete accepts only action and id. Omit record fields.');
    return client.deleteRecord(resource, recordId);
  }
  return client.updateRecord(resource, recordId, data);
};

const companyBody = (input: {
  name?: string;
  info?: string | null;
  color?: string | null;
  acronym?: string | null;
  active?: boolean | null;
  billable?: boolean | null;
  externalId?: string | null;
}): ApiRecord => ({
  name: input.name,
  info: input.info,
  color: input.color,
  acronym: input.acronym,
  active: input.active,
  billable: input.billable,
  ext_tool_id: input.externalId
});

export const listRecordsTool = SlateTool.create(spec, {
  name: 'List Records',
  key: 'list_records',
  description:
    'Discover clients, projects, services, users, or time entries using current Timelink string IDs. Returns one provider page and its original pagination metadata. Use these IDs with get_record and the manage_*_record tools.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resource: resourceSchema,
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Requested page size; provider defaults apply when omitted'),
      search: z.string().optional().describe('Provider search text'),
      ids: z.array(z.string()).optional().describe('Filter to specific string IDs'),
      orders: z
        .array(z.object({ column: z.string(), direction: z.enum(['asc', 'desc']) }))
        .optional()
        .describe('Provider sort columns and directions'),
      active: z
        .boolean()
        .optional()
        .describe('Active filter for clients, projects, services, or users'),
      clientId: idSchema.optional().describe('Client filter for projects or timeEntries'),
      projectId: idSchema.optional().describe('Project filter for timeEntries'),
      serviceId: idSchema.optional().describe('Service filter for timeEntries'),
      userId: idSchema.optional().describe('User filter for timeEntries'),
      userIds: z.array(z.string()).optional().describe('User IDs filter for timeEntries'),
      after: z
        .string()
        .optional()
        .describe('Start date/time filter for timeEntries; sent as start'),
      before: z
        .string()
        .optional()
        .describe('End date/time filter for timeEntries; sent as end'),
      externalId: z.string().optional().describe('External system ID filter for timeEntries'),
      onlyDeleted: z.boolean().optional().describe('Only deleted timeEntries'),
      isInterrupt: z.boolean().optional().describe('Interruption filter for timeEntries'),
      isBilled: z.boolean().optional().describe('Billing status filter for timeEntries'),
      isBillable: z.boolean().optional().describe('Billable status filter for timeEntries'),
      searchInDescription: z
        .string()
        .optional()
        .describe('Description search for timeEntries'),
      exact: z.boolean().optional().describe('Exact search for timeEntries'),
      withRelations: z.boolean().optional().describe('Include related records for timeEntries')
    })
  )
  .output(pageOutput)
  .handleInvocation(async ctx => {
    const {
      resource,
      clientId,
      projectId,
      serviceId,
      userId,
      userIds,
      after,
      before,
      externalId,
      onlyDeleted,
      isInterrupt,
      isBilled,
      isBillable,
      searchInDescription,
      exact,
      withRelations,
      ...common
    } = ctx.input;
    if (resource === 'timeEntries' && common.active !== undefined) {
      throw createApiServiceError('active is not a documented timeEntries filter.');
    }
    const timeFilters = {
      projectId,
      serviceId,
      userId,
      userIds,
      start: after,
      end: before,
      extToolId: externalId,
      onlyDeleted,
      isInterrupt,
      isBilled,
      isBillable,
      searchInDescription,
      exact,
      withRelations
    };
    if (
      resource !== 'timeEntries' &&
      Object.values(timeFilters).some(value => value !== undefined)
    ) {
      throw createApiServiceError('Time entry filters require resource timeEntries.');
    }
    if (clientId !== undefined && resource !== 'projects' && resource !== 'timeEntries') {
      throw createApiServiceError('clientId is supported only for projects or timeEntries.');
    }
    validateDate(after, 'after');
    validateDate(before, 'before');
    const params: ApiRecord = { ...common };
    if (resource === 'timeEntries') Object.assign(params, timeFilters, { clientId });
    if (resource === 'projects') params.client_id = clientId;
    const page = await new CurrentClient({ token: ctx.auth.token }).listRecords(
      resource,
      params
    );
    return {
      output: { ...page, count: page.records.length },
      message: `Retrieved ${page.records.length} ${resource} record(s) on this page.`
    };
  })
  .build();

export const getRecordTool = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description:
    'Retrieve one client, project, service, user, or time entry by its current Timelink string ID. Use list_records to discover IDs. Preserves the original provider record.',
  tags: { readOnly: true }
})
  .input(z.object({ resource: resourceSchema, id: idSchema }))
  .output(recordOutput)
  .handleInvocation(async ctx => ({
    output: {
      record: await new CurrentClient({ token: ctx.auth.token }).getRecord(
        ctx.input.resource,
        ctx.input.id
      )
    },
    message: 'Retrieved the Timelink record.'
  }))
  .build();

export const manageClientRecordTool = SlateTool.create(spec, {
  name: 'Manage Client Record',
  key: 'manage_client_record',
  description:
    'Create, update, or permanently delete a client using Timelink string IDs. Use list_records to discover IDs. Update changes only supplied fields; delete requires only action and id.',
  tags: { destructive: true }
})
  .input(z.object(commonFields))
  .output(recordOutput)
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create')
      requireText(ctx.input.name, 'name when creating a client');
    const record = await mutate(
      new CurrentClient({ token: ctx.auth.token }),
      'clients',
      ctx.input.action,
      ctx.input.id,
      companyBody(ctx.input)
    );
    return { output: { record }, message: `Timelink confirmed client ${ctx.input.action}.` };
  })
  .build();

export const manageProjectRecordTool = SlateTool.create(spec, {
  name: 'Manage Project Record',
  key: 'manage_project_record',
  description:
    'Create, update, or permanently delete a project using Timelink string IDs. Use list_records to discover project and client IDs. Update changes supplied fields; delete requires only action and id.',
  tags: { destructive: true }
})
  .input(
    z.object({
      ...commonFields,
      clientId: z.string().optional().describe('Client string ID from list_records'),
      externalClientId: optionalText.describe(
        'Client external system ID, sent as ext_client_id'
      ),
      demoFlag: optionalFlag.describe('Demo flag, supported only for update')
    })
  )
  .output(recordOutput)
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create') {
      requireText(ctx.input.name, 'name when creating a project');
      if (ctx.input.demoFlag !== undefined)
        throw createApiServiceError('demoFlag is supported only for update.');
    }
    const record = await mutate(
      new CurrentClient({ token: ctx.auth.token }),
      'projects',
      ctx.input.action,
      ctx.input.id,
      {
        ...companyBody(ctx.input),
        client_id: ctx.input.clientId,
        ext_client_id: ctx.input.externalClientId,
        demo_flag: ctx.input.demoFlag
      }
    );
    return { output: { record }, message: `Timelink confirmed project ${ctx.input.action}.` };
  })
  .build();

export const manageServiceRecordTool = SlateTool.create(spec, {
  name: 'Manage Service Record',
  key: 'manage_service_record',
  description:
    'Create, update, or permanently delete a service using Timelink string IDs. Use list_records to discover IDs. Supports billable status and a default time entry description. Delete requires only action and id.',
  tags: { destructive: true }
})
  .input(
    z.object({
      ...commonFields,
      defaultTimeEntryDescription: optionalText.describe(
        'Default description for time entries using this service; null clears it'
      )
    })
  )
  .output(recordOutput)
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create')
      requireText(ctx.input.name, 'name when creating a service');
    const record = await mutate(
      new CurrentClient({ token: ctx.auth.token }),
      'services',
      ctx.input.action,
      ctx.input.id,
      {
        ...companyBody(ctx.input),
        default_time_entry_description: ctx.input.defaultTimeEntryDescription
      }
    );
    return { output: { record }, message: `Timelink confirmed service ${ctx.input.action}.` };
  })
  .build();

export const manageTimeEntryRecordTool = SlateTool.create(spec, {
  name: 'Manage Time Entry Record',
  key: 'manage_time_entry_record',
  description:
    'Create, update, or permanently delete a time entry using current Timelink string IDs. Creating requires userId and start; end may be omitted for a running entry. Discover IDs with list_records and company-specific requirements with get_time_entry_fields. Delete requires only action and id.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: actionSchema,
      id: idSchema.optional(),
      userId: z
        .string()
        .optional()
        .describe('Required when creating; discover user string IDs with list_records'),
      clientId: optionalText.describe('Client string ID from list_records; null clears it'),
      projectId: optionalText.describe('Project string ID from list_records; null clears it'),
      serviceId: optionalText.describe('Service string ID from list_records; null clears it'),
      start: z
        .string()
        .optional()
        .describe('Required when creating; start date/time, sent as started_at'),
      end: optionalText.describe('End date/time; omit or use null for a running entry'),
      description: optionalText.describe('Work description; null clears it'),
      billable: optionalFlag.describe('Whether the entry is billable'),
      billedAt: optionalText.describe(
        'Billing date/time; null clears it. This is billing, not payment status.'
      ),
      isInterrupt: optionalFlag.describe('Whether the entry is an interruption'),
      externalId: optionalText.describe('External system ID; null clears it'),
      temporaryId: optionalText.describe('Temporary ID used by the provider; null clears it')
    })
  )
  .output(recordOutput)
  .handleInvocation(async ctx => {
    const i = ctx.input;
    if (i.action === 'create') {
      requireText(i.userId, 'userId when creating a time entry');
      requireText(i.start, 'start when creating a time entry');
    }
    validateDate(i.start, 'start');
    validateDate(i.end, 'end');
    validateDate(i.billedAt, 'billedAt');
    if (
      i.start !== undefined &&
      i.end !== undefined &&
      i.end !== null &&
      Date.parse(i.end) < Date.parse(i.start)
    ) {
      throw createApiServiceError('end must not be earlier than start.');
    }
    const record = await mutate(
      new CurrentClient({ token: ctx.auth.token }),
      'timeEntries',
      i.action,
      i.id,
      {
        user_id: i.userId,
        client_id: i.clientId,
        project_id: i.projectId,
        service_id: i.serviceId,
        started_at: i.start,
        ended_at: i.end,
        description: i.description,
        billable: i.billable,
        billed_at: i.billedAt,
        is_interrupt: i.isInterrupt,
        ext_tool_id: i.externalId,
        temp_id: i.temporaryId
      }
    );
    return { output: { record }, message: `Timelink confirmed time entry ${i.action}.` };
  })
  .build();

export const getCurrentTokenTool = SlateTool.create(spec, {
  name: 'Get Current Token',
  key: 'get_current_token',
  description:
    'Identify the connected API token and inspect its provider-reported abilities and timestamps. This returns credential metadata, not a user profile or the secret token.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ token: recordSchema }))
  .handleInvocation(async ctx => ({
    output: { token: await new CurrentClient({ token: ctx.auth.token }).getCurrentToken() },
    message: 'Retrieved API token metadata.'
  }))
  .build();

export const getCompanyTool = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description:
    'Identify the connected company and retrieve its provider-reported contact, subscription, integration, and settings information.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ company: recordSchema }))
  .handleInvocation(async ctx => ({
    output: { company: await new CurrentClient({ token: ctx.auth.token }).getCompany() },
    message: 'Retrieved the connected company.'
  }))
  .build();

export const getTimeEntryFieldsTool = SlateTool.create(spec, {
  name: 'Get Time Entry Required Fields',
  key: 'get_time_entry_fields',
  description:
    'Retrieve the company-specific field names required for time entries before creating or updating entries.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ fields: z.array(z.string()) }))
  .handleInvocation(async ctx => ({
    output: {
      fields: await new CurrentClient({ token: ctx.auth.token }).getRequiredTimeEntryFields()
    },
    message: 'Retrieved required time entry field names.'
  }))
  .build();

export const listActiveTimeEntriesTool = SlateTool.create(spec, {
  name: 'List Active Time Entries',
  key: 'list_active_time_entries',
  description:
    'List a provider page of running time entries with their string IDs, original fields, and pagination metadata.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().int().positive().optional().describe('Requested page size'),
      withRelations: z.boolean().optional().describe('Include related records')
    })
  )
  .output(pageOutput)
  .handleInvocation(async ctx => {
    const page = await new CurrentClient({ token: ctx.auth.token }).listActiveTimeEntries(
      ctx.input
    );
    return {
      output: { ...page, count: page.records.length },
      message: `Retrieved ${page.records.length} active time entry record(s) on this page.`
    };
  })
  .build();

export const currentRecordTools = [
  listRecordsTool,
  getRecordTool,
  manageClientRecordTool,
  manageProjectRecordTool,
  manageServiceRecordTool,
  manageTimeEntryRecordTool,
  getCurrentTokenTool,
  getCompanyTool,
  getTimeEntryFieldsTool,
  listActiveTimeEntriesTool
];
