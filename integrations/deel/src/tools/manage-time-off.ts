import { anyOf, createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  dataList,
  objectList,
  objectResponse,
  requireDate,
  requireText,
  resourceSchema
} from '../lib/response';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

let dailySchema = z.object({
  date: z.string(),
  dayType: z.enum(['HALF_DAY', 'FULL_DAY', 'PERCENTAGE', 'HOURLY']),
  hours: z.number().optional(),
  amount: z.number().optional()
});
export let manageTimeOff = SlateTool.create(spec, {
  name: 'Manage Time Off',
  key: 'manage_time_off',
  description:
    'List time-off requests or assigned policies, create or update requests, or cancel a request. Cancellation retains a CANCELED record and cannot be reversed.',
  instructions: [
    'Use list_people to discover an HRIS profile ID, then action policies to discover assigned policy/type IDs.',
    'For create, supply profileId,startDate,endDate and policyId or timeOffTypeId. The default request status is REQUESTED.',
    'For update, supply timeOffId and changed fields. Required profile/date context is read from the existing request when omitted.',
    'The legacy delete action cancels a request and verifies the retained CANCELED state.'
  ],
  tags: { destructive: true }
})
  .scopes(anyOf('time-off:read', 'time-off:write', 'worker:write'))
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete', 'policies'])
        .describe('Action to perform'),
      profileId: z
        .string()
        .optional()
        .describe('HRIS profile ID from list_people; required for list, policies and create'),
      timeOffId: z.string().optional().describe('Request ID required for update or delete'),
      contractId: z.string().optional().describe('For create: related contract ID'),
      startDate: z
        .string()
        .optional()
        .describe('For create/update: first requested date YYYY-MM-DD'),
      endDate: z
        .string()
        .optional()
        .describe('For create/update: last requested date YYYY-MM-DD'),
      type: z
        .string()
        .optional()
        .describe(
          'Legacy field; use explicit policyId or timeOffTypeId discovered with policies'
        ),
      reason: z.string().optional().describe('For create/update: reason'),
      halfDay: z
        .boolean()
        .optional()
        .describe(
          'For create/update: single-date half-day request; use dates for an explicit breakdown'
        ),
      policyId: z.string().optional().describe('Assigned policy ID from the policies action'),
      timeOffTypeId: z
        .string()
        .optional()
        .describe('Assigned time-off type ID from the policies action'),
      status: z
        .enum(['REQUESTED', 'APPROVED'])
        .optional()
        .describe('For create: request status; defaults to REQUESTED'),
      description: z
        .string()
        .optional()
        .describe('For create/update: description; some policies require it'),
      dates: z
        .array(dailySchema)
        .optional()
        .describe(
          'For create/update: explicit daily breakdown; all entries must use the same dayType'
        ),
      pageSize: z.number().optional().describe('For list: page size 5–200'),
      next: z.string().optional().describe('For list: next cursor returned by the prior page'),
      timeOffIds: z
        .array(z.string())
        .optional()
        .describe('For list: filter to these exact request IDs')
    })
  )
  .output(
    z.object({
      timeOffs: z
        .array(resourceSchema)
        .optional()
        .describe('Listed or created requests; creation can produce multiple records'),
      timeOff: resourceSchema
        .optional()
        .describe('Single created, updated or cancelled request'),
      policies: z.array(resourceSchema).optional(),
      next: z.string().nullable().optional(),
      hasNextPage: z.boolean().optional(),
      count: z.number().optional(),
      cancelled: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;
    if (input.action === 'policies') {
      let profileId = requireText(input.profileId, 'profileId');
      let policies = objectList(
        objectResponse(await client.listTimeOffPolicies(profileId), 'policies').policies,
        'policies'
      );
      return {
        output: { policies },
        message: `Found ${policies.length} assigned time-off policy/policies.`
      };
    }
    if (input.action === 'list') {
      let profileId = requireText(input.profileId, 'profileId');
      if (
        input.pageSize !== undefined &&
        (!Number.isSafeInteger(input.pageSize) || input.pageSize < 5 || input.pageSize > 200)
      )
        throw createApiServiceError('pageSize must be an integer between 5 and 200.');
      let result = objectResponse(
        await client.listTimeOffs(profileId, {
          page_size: input.pageSize,
          next: input.next,
          time_off_ids: input.timeOffIds
        }),
        'time off'
      );
      let timeOffs = dataList(result, 'time off');
      let paging = z
        .object({
          next: z.string().nullable().optional(),
          has_next_page: z.boolean(),
          count: z.number().optional()
        })
        .safeParse(result);
      if (!paging.success)
        throw createApiServiceError('Deel returned invalid time-off pagination metadata.');
      return {
        output: {
          timeOffs,
          next: paging.data.next,
          hasNextPage: paging.data.has_next_page,
          count: paging.data.count
        },
        message: `Found ${timeOffs.length} time-off request(s).`
      };
    }
    if (input.action === 'delete') {
      let id = requireText(input.timeOffId, 'timeOffId');
      let before = dataList(
        await client.listOrganizationTimeOffs({
          time_off_ids: [id],
          include_deleted_time_offs: true
        }),
        'time off'
      ).find(item => item.id === id);
      if (!before)
        throw createApiServiceError(
          'The requested time-off record could not be found; cancellation was not attempted.'
        );
      if (before.status !== 'CANCELED') await client.deleteTimeOff(id);
      let after = dataList(
        await client.listOrganizationTimeOffs({
          time_off_ids: [id],
          include_deleted_time_offs: true
        }),
        'time off'
      ).find(item => item.id === id);
      if (!after || after.status !== 'CANCELED')
        throw createApiServiceError(
          'Time-off cancellation could not be verified. Check the retained request before retrying.'
        );
      return {
        output: { timeOff: after, cancelled: true },
        message: `Confirmed time-off request **${id}** is CANCELED. The record remains in its history.`
      };
    }
    if (input.type !== undefined)
      throw createApiServiceError(
        'Use policyId or timeOffTypeId from the policies action; Deel does not accept a free-text time-off type.'
      );
    if (input.policyId && input.timeOffTypeId)
      throw createApiServiceError('Choose policyId or timeOffTypeId, not both.');
    if (input.action === 'update' && input.status !== undefined)
      throw createApiServiceError(
        'status applies only to create; time-off approval is a separate workflow.'
      );
    let existing: Record<string, unknown> | undefined;
    if (input.action === 'update') {
      let id = requireText(input.timeOffId, 'timeOffId');
      if (
        ![
          input.profileId,
          input.startDate,
          input.endDate,
          input.policyId,
          input.timeOffTypeId,
          input.reason,
          input.description,
          input.halfDay,
          input.dates
        ].some(value => value !== undefined)
      )
        throw createApiServiceError('Provide at least one time-off field to update.');
      existing = dataList(
        await client.listOrganizationTimeOffs({
          time_off_ids: [id],
          include_deleted_time_offs: true
        }),
        'time off'
      ).find(item => item.id === id);
      if (!existing)
        throw createApiServiceError(
          'The requested time-off record could not be found; update was not attempted.'
        );
      if (['CANCELED', 'DELETED'].includes(String(existing.status)))
        throw createApiServiceError(
          'A cancelled or deleted time-off request cannot be edited.'
        );
    }
    let recipient = existing?.recipient_profile
      ? objectResponse(existing.recipient_profile, 'recipient profile')
      : undefined;
    let profileId = requireText(input.profileId ?? recipient?.hris_profile_id, 'profileId');
    let startDate = requireDate(input.startDate ?? existing?.start_date, 'startDate');
    let endDate = requireDate(input.endDate ?? existing?.end_date, 'endDate');
    if (startDate > endDate) throw createApiServiceError('endDate cannot precede startDate.');
    let policyId = input.policyId;
    let typeId =
      input.timeOffTypeId ??
      (!policyId && typeof existing?.time_off_type_id === 'string'
        ? existing.time_off_type_id
        : undefined);
    if (!policyId && !typeId)
      throw createApiServiceError(
        'policyId or timeOffTypeId is required. Discover assigned IDs with the policies action.'
      );
    let policy = policyId ?? typeId;
    if (!z.uuid().safeParse(policy).success || !z.uuid().safeParse(profileId).success)
      throw createApiServiceError(
        'profileId and policy/type IDs must be valid UUIDs from the discovery tools.'
      );
    let dates = input.dates;
    if (input.halfDay !== undefined) {
      if (dates !== undefined || startDate !== endDate)
        throw createApiServiceError(
          'halfDay applies to one date only. Use an explicit dates breakdown for ranges.'
        );
      dates = [{ date: startDate, dayType: input.halfDay ? 'HALF_DAY' : 'FULL_DAY' }];
    }
    if (dates) {
      if (
        !dates.length ||
        new Set(dates.map(day => day.date)).size !== dates.length ||
        new Set(dates.map(day => day.dayType)).size !== 1
      )
        throw createApiServiceError('Provide unique dates with one consistent dayType.');
      for (let day of dates) {
        requireDate(day.date, 'dates.date');
        if (day.date < startDate || day.date > endDate)
          throw createApiServiceError(
            'Every daily breakdown date must be inside the requested range.'
          );
        if (
          (day.hours !== undefined && (!Number.isFinite(day.hours) || day.hours <= 0)) ||
          (day.amount !== undefined && (!Number.isFinite(day.amount) || day.amount <= 0))
        )
          throw createApiServiceError(
            'Daily hours and amount must be positive finite numbers.'
          );
      }
    }
    let data = pickDefined({
      recipient_profile_id: profileId,
      start_date: startDate,
      end_date: endDate,
      policy_id: policyId,
      time_off_type_id: typeId,
      contract_oid: input.contractId,
      reason: input.reason,
      description: input.description,
      dates: dates?.map(day =>
        pickDefined({
          date: day.date,
          day_type: day.dayType,
          hours: day.hours,
          amount: day.amount
        })
      ),
      ...(input.action === 'create' ? { status: input.status ?? 'REQUESTED' } : {})
    });
    if (input.action === 'create') {
      let timeOffs = objectList(
        objectResponse(await client.createTimeOff(data), 'created time off').time_offs,
        'created time off'
      );
      if (!timeOffs.length)
        throw createApiServiceError(
          'Deel did not return any created time-off requests. Check before retrying.'
        );
      return {
        output: { timeOffs, ...(timeOffs.length === 1 ? { timeOff: timeOffs[0] } : {}) },
        message: `Created ${timeOffs.length} time-off request(s).`
      };
    }
    let timeOff = objectResponse(
      objectResponse(
        await client.updateTimeOff(requireText(input.timeOffId, 'timeOffId'), data),
        'updated time off'
      ).time_off,
      'updated time off'
    );
    if (timeOff.id !== input.timeOffId)
      throw createApiServiceError(
        'Deel returned a different request after the update. Verify the requested record.'
      );
    return {
      output: { timeOff },
      message: `Updated time-off request **${input.timeOffId}**.`
    };
  })
  .build();
