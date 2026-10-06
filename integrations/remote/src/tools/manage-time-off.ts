import { z } from 'zod';
import { collection, pageOutput, pageParams, single } from '../lib/client';
import { remoteTool } from '../lib/tool';
import {
  date,
  fail,
  id,
  integer,
  isRecord,
  pageSchema,
  pageSizeSchema,
  paginationOutput,
  recordSchema,
  rejectFields,
  required,
  timestamp
} from '../lib/validation';
export let manageTimeOff = remoteTool(
  {
    name: 'Manage Time Off',
    key: 'manage_time_off',
    description:
      'Read time off and leave policies, create already-approved leave with explicit daily hours, or approve, decline, and cancel supported requests. Creation changes leave balances; cancellation retains the history.',
    tags: { destructive: true }
  },
  z.object({
    action: z.enum([
      'create',
      'approve',
      'decline',
      'cancel',
      'list',
      'get_leave_policies',
      'get',
      'list_types',
      'get_leave_policy_details'
    ]),
    timeoffId: z.string().optional(),
    employmentId: z.string().optional(),
    timeoffType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    timezone: z.string().optional(),
    notes: z.string().optional(),
    startDateIsHalfDay: z
      .boolean()
      .optional()
      .describe('Legacy flag; use explicit timeoffDays hours instead.'),
    endDateIsHalfDay: z
      .boolean()
      .optional()
      .describe('Legacy flag; use explicit timeoffDays hours instead.'),
    status: z.string().optional(),
    page: pageSchema,
    pageSize: pageSizeSchema,
    timeoffDays: z
      .array(z.object({ day: z.string(), hours: z.number() }))
      .optional()
      .describe(
        'Required for create: one entry per calendar day, with integer hours 0–8; include zero-hour non-working days.'
      ),
    approverId: z
      .string()
      .nullable()
      .optional()
      .describe(
        'Remote approver user ID, or null for external approval. Defaults to the current authorizing user.'
      ),
    approvedAt: z
      .string()
      .optional()
      .describe('Approval timestamp for create, defaulting to the current time.'),
    leavePolicyVariantId: z.string().optional(),
    employmentType: z.enum(['contractor', 'full_time']).optional(),
    document: z.object({ name: z.string(), content: z.string() }).optional()
  }),
  z.object({
    timeoff: recordSchema.optional(),
    timeoffs: z.array(recordSchema).optional(),
    leavePolicies: z.array(recordSchema).optional(),
    timeoffTypes: z.array(recordSchema).optional(),
    ...paginationOutput
  }),
  async (client, input) => {
    if (input.action === 'list') {
      let value = await client.get('/timeoff', {
        ...pageParams(input),
        employment_id: input.employmentId === undefined ? undefined : id(input.employmentId),
        timeoff_type: input.timeoffType,
        status: input.status
      });
      return {
        output: { timeoffs: collection(value, 'timeoffs'), ...pageOutput(value) },
        message: 'Retrieved a time-off page.'
      };
    }
    if (input.action === 'list_types') {
      let value = await client.get('/timeoff/types', { type: input.employmentType });
      return {
        output: { timeoffTypes: collection(value, 'timeoff_types') },
        message: 'Retrieved available time-off types.'
      };
    }
    if (input.action === 'get_leave_policies' || input.action === 'get_leave_policy_details') {
      let path = input.action === 'get_leave_policies' ? 'summary' : 'details';
      return {
        output: {
          leavePolicies: collection(
            await client.get(
              `/leave-policies/${path}/${id(input.employmentId, 'Employment ID')}`
            ),
            'leave_policies'
          )
        },
        message: `Retrieved leave-policy ${path}.`
      };
    }
    if (input.action === 'get')
      return {
        output: { timeoff: await client.entity('/timeoff', 'timeoff', input.timeoffId) },
        message: 'Retrieved the time-off record.'
      };
    if (input.action === 'create') {
      rejectFields(
        input,
        ['startDateIsHalfDay', 'endDateIsHalfDay'],
        'The current create API requires explicit timeoffDays. Remove legacy half-day flags and specify each calendar day with hours 0–8.'
      );
      let employmentId = id(input.employmentId, 'Employment ID');
      let start = date(input.startDate, 'Start date');
      let end = date(input.endDate, 'End date');
      if (start > end) fail('Start date must be before or equal to end date.');
      let timezone = required(input.timezone, 'Timezone');
      try {
        new Intl.DateTimeFormat('en', { timeZone: timezone });
      } catch {
        fail('Timezone must be a valid IANA timezone.');
      }
      if (!input.timeoffType && !input.leavePolicyVariantId)
        fail(
          'Provide timeoffType from list_types or leavePolicyVariantId from get_leave_policy_details.'
        );
      if (!input.timeoffDays?.length)
        fail(
          'timeoffDays is required. Supply one explicit entry for every calendar day, including zero-hour non-working days.'
        );
      let days = input.timeoffDays.map(day => ({
        day: date(day.day, 'Time-off day'),
        hours: integer(day.hours, 'Time-off hours', 0, 8)
      }));
      let expectedCount = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
      if (
        days.length !== expectedCount ||
        new Set(days.map(day => day.day)).size !== expectedCount ||
        days.some(day => day.day < start || day.day > end)
      )
        fail(
          'timeoffDays must contain each calendar day in the requested interval exactly once.'
        );
      await client.employment(employmentId);
      let approver: string | null = input.approverId ?? null;
      if (input.approverId === undefined) {
        let identity = (await client.getIdentity()).identity;
        approver = id(
          isRecord(identity.user) ? identity.user.id : undefined,
          'Authorizing approver ID'
        );
      } else if (input.approverId !== null) approver = id(input.approverId, 'Approver ID');
      let value = await client.post('/timeoff', {
        employment_id: employmentId,
        start_date: start,
        end_date: end,
        timezone,
        timeoff_type: input.timeoffType,
        leave_policy_variant_id:
          input.leavePolicyVariantId === undefined
            ? undefined
            : id(input.leavePolicyVariantId),
        notes: input.notes,
        timeoff_days: days,
        status: 'approved',
        approver_id: approver,
        approved_at:
          input.approvedAt === undefined
            ? new Date().toISOString()
            : timestamp(input.approvedAt, 'Approval timestamp'),
        document: input.document
      });
      return {
        output: { timeoff: single(value, 'timeoff') },
        message:
          'Remote created already-approved time off. This was not a pending leave request.'
      };
    }
    let timeoffId = id(input.timeoffId, 'Time-off ID');
    let current = await client.entity('/timeoff', 'timeoff', timeoffId);
    let target = input.action === 'cancel' ? 'approved' : 'requested';
    if (current.status !== target)
      fail(
        `${input.action} requires time off currently in ${target} status. Read the current record and use the appropriate lifecycle action.`
      );
    let body: {
      approver_id?: string | null;
      decline_reason?: string | null;
      cancel_reason?: string;
    } = {};
    if (input.action === 'approve') {
      if (input.approverId === undefined) {
        let identity = (await client.getIdentity()).identity;
        body.approver_id = id(
          isRecord(identity.user) ? identity.user.id : undefined,
          'Authorizing approver ID'
        );
      } else
        body.approver_id =
          input.approverId === null ? null : id(input.approverId, 'Approver ID');
    }
    if (input.action === 'decline') body.decline_reason = input.notes ?? null;
    if (input.action === 'cancel')
      body.cancel_reason = required(input.notes, 'Cancellation reason in notes');
    let timeoff = single(
      await client.post(`/timeoff/${timeoffId}/${input.action}`, body),
      'timeoff',
      timeoffId
    );
    return {
      output: { timeoff },
      message: `Remote accepted the time-off ${input.action} operation. The returned record contains its current status.`
    };
  }
);
