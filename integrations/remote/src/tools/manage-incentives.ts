import { pickDefined } from 'slates';
import { z } from 'zod';
import { collection, pageOutput, pageParams, single } from '../lib/client';
import { remoteTool } from '../lib/tool';
import {
  date,
  fail,
  id,
  integer,
  nonempty,
  pageSchema,
  pageSizeSchema,
  paginationOutput,
  type RecordData,
  record,
  recordSchema,
  rejectFields,
  required
} from '../lib/validation';
export let manageIncentives = remoteTool(
  {
    name: 'Manage Incentives',
    key: 'manage_incentives',
    description:
      'Read and manage one-time or monthly recurring incentives in the employment currency. Amounts use integer hundredths. Deleting a recurring series cancels pending occurrences only and returns payouts that were already scheduled.',
    tags: { destructive: true }
  },
  z.object({
    action: z.enum([
      'create',
      'create_recurring',
      'update',
      'delete',
      'delete_recurring',
      'list',
      'list_recurring',
      'get'
    ]),
    incentiveId: z.string().optional(),
    recurringIncentiveId: z.string().optional(),
    employmentId: z.string().optional(),
    amount: z
      .number()
      .optional()
      .describe('Integer hundredths of the employment currency (50025 means 500.25).'),
    amountTaxType: z.string().optional(),
    type: z.string().optional(),
    effectiveDate: z.string().optional(),
    startDate: z
      .string()
      .optional()
      .describe('Recurring effective date; retained alias for effectiveDate.'),
    endDate: z
      .string()
      .optional()
      .describe(
        'Optional last recurrence date. Must align with the provider monthly schedule; otherwise use durationInMonths.'
      ),
    note: z.string().optional(),
    currency: z
      .string()
      .optional()
      .describe(
        'Legacy field; the current API uses the employment currency. Omit this field.'
      ),
    status: z.string().optional(),
    page: pageSchema,
    pageSize: pageSizeSchema,
    durationInMonths: z.number().optional(),
    periodStart: z.string().optional(),
    periodEnd: z.string().optional()
  }),
  z.object({
    incentive: recordSchema.optional(),
    incentives: z.array(recordSchema).optional(),
    deleted: z.boolean().optional(),
    fullyCancelled: z.boolean().optional(),
    alreadyScheduledIncentives: z.array(recordSchema).optional(),
    ...paginationOutput
  }),
  async (client, input) => {
    if (input.action === 'list' || input.action === 'list_recurring') {
      if (input.action === 'list_recurring')
        rejectFields(
          input,
          ['employmentId'],
          'The current recurring-incentive list does not document employmentId filtering. Omit it and inspect employment_id on the returned page.'
        );
      let recurring = input.action === 'list_recurring';
      let value = await client.get(recurring ? '/incentives/recurring' : '/incentives', {
        ...pageParams(input),
        employment_id:
          recurring || input.employmentId === undefined ? undefined : id(input.employmentId),
        status: input.status
      });
      return {
        output: {
          incentives: collection(value, recurring ? 'recurring_incentives' : 'incentives'),
          ...pageOutput(value)
        },
        message: 'Retrieved an incentive page.'
      };
    }
    if (input.action === 'get')
      return {
        output: {
          incentive: await client.entity('/incentives', 'incentive', input.incentiveId)
        },
        message: 'Retrieved the incentive.'
      };
    if (input.action === 'delete_recurring') {
      let recurringId = id(input.recurringIncentiveId, 'Recurring incentive ID');
      let found = false;
      for (let page = 1; page <= 1000; page++) {
        let value = await client.get('/incentives/recurring', { page, page_size: 100 });
        if (collection(value, 'recurring_incentives').some(row => row.id === recurringId)) {
          found = true;
          break;
        }
        let meta = pageOutput(value);
        if (meta.hasMore === false) break;
        if (meta.hasMore === undefined)
          fail(
            'Remote omitted recurring-incentive pagination metadata. Refresh the series list before deleting.'
          );
      }
      if (!found)
        fail(
          'The recurring incentive was not found in a complete accessible list. Refresh its ID before deleting.'
        );
      let data = record(
        record(
          await client.remove(`/incentives/recurring/${recurringId}`),
          'recurring delete response'
        ).data,
        'recurring delete data'
      );
      if (data.status !== 'ok')
        fail(
          'Remote did not confirm pending recurring-incentive cancellation. Read the series before retrying.'
        );
      let scheduled = collection(
        { data: data.already_scheduled_incentives },
        'already_scheduled_incentives'
      );
      return {
        output: {
          deleted: true,
          fullyCancelled: scheduled.length === 0,
          alreadyScheduledIncentives: scheduled
        },
        message: scheduled.length
          ? 'Remote cancelled pending occurrences. Already scheduled payouts remain and are included in the result.'
          : 'Remote confirmed pending recurring-incentive cancellation and returned no already-scheduled payouts. Historical records remain.'
      };
    }
    if (input.action === 'delete' || input.action === 'update') {
      let incentiveId = id(input.incentiveId, 'Incentive ID');
      let current = await client.entity('/incentives', 'incentive', incentiveId);
      if (
        current.status === 'paid' ||
        current.status === 'processing' ||
        current.status === 'deleted'
      )
        fail(
          'This incentive cannot be changed in its current paid, processing, or deleted state. Read its status and do not assume a payout can be reversed.'
        );
      if (input.action === 'delete') {
        let data = record(
          record(await client.remove(`/incentives/${incentiveId}`), 'delete response').data,
          'delete data'
        );
        if (data.status !== 'ok')
          fail(
            'Remote did not confirm incentive deletion. Read the incentive before retrying.'
          );
        return {
          output: { deleted: true },
          message:
            'Remote confirmed incentive cancellation; historical records and completed payouts are not erased.'
        };
      }
      rejectFields(
        input,
        ['currency', 'startDate', 'endDate', 'durationInMonths'],
        'Current one-time incentive updates use the employment currency and effectiveDate. Omit currency and recurring schedule fields.'
      );
      let body = incentiveFields(input);
      nonempty(body, 'Incentive update');
      let incentive = single(
        await client.patch(`/incentives/${incentiveId}`, body),
        'incentive',
        incentiveId
      );
      return { output: { incentive }, message: 'Remote accepted the incentive update.' };
    }
    rejectFields(
      input,
      ['currency'],
      'Incentives use the currency of the selected employment. The current API does not accept a currency override; omit currency and verify the employment currency before creating payroll items.'
    );
    let employmentId = id(input.employmentId, 'Employment ID');
    await client.employment(employmentId);
    let recurring = input.action === 'create_recurring';
    let effectiveDate = recurring
      ? (input.effectiveDate ?? input.startDate)
      : input.effectiveDate;
    if (
      recurring &&
      input.effectiveDate &&
      input.startDate &&
      input.effectiveDate !== input.startDate
    )
      fail('effectiveDate and startDate must agree.');
    let body = incentiveFields({ ...input, effectiveDate });
    required(body.type, 'Incentive type');
    integer(body.amount, 'Incentive amount');
    required(body.amount_tax_type, 'Amount tax type');
    required(body.effective_date, 'Effective date');
    body.employment_id = employmentId;
    if (recurring) {
      rejectFields(
        input,
        ['periodStart', 'periodEnd'],
        'The recurring-incentive API does not accept periodStart or periodEnd. Omit them; use effectiveDate and durationInMonths for the monthly schedule.'
      );
      let duration =
        input.durationInMonths === undefined
          ? undefined
          : integer(input.durationInMonths, 'Duration in months', 1);
      if (input.endDate !== undefined) {
        let end = date(input.endDate, 'End date');
        let start = date(effectiveDate, 'Start date');
        let months =
          (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 +
          Number(end.slice(5, 7)) -
          Number(start.slice(5, 7)) +
          1;
        if (months < 1) fail('Recurring endDate must not precede startDate.');
        let day = Number(start.slice(8));
        let expected =
          day >= 28
            ? new Date(
                Date.UTC(Number(end.slice(0, 4)), Number(end.slice(5, 7)), 0)
              ).getUTCDate()
            : day;
        if (Number(end.slice(8)) !== expected)
          fail(
            'endDate does not align with the current monthly last-day rule. Supply durationInMonths instead of an ambiguous end date.'
          );
        if (duration !== undefined && duration !== months)
          fail('endDate and durationInMonths disagree.');
        duration = months;
      }
      if (duration !== undefined) body.duration_in_months = String(duration);
    } else
      rejectFields(
        input,
        ['startDate', 'endDate', 'durationInMonths'],
        'One-time incentives use effectiveDate; recurring schedule fields belong to create_recurring.'
      );
    let incentive = single(
      await client.post(recurring ? '/incentives/recurring' : '/incentives', body),
      recurring ? 'recurring_incentive' : 'incentive'
    );
    return {
      output: { incentive },
      message: 'Remote created the incentive schedule. No payout completion is asserted.'
    };
  }
);
function incentiveFields(input: {
  amount?: number;
  amountTaxType?: string;
  type?: string;
  effectiveDate?: string;
  note?: string;
  periodStart?: string;
  periodEnd?: string;
}): RecordData {
  if (input.amountTaxType !== undefined && !['gross', 'net'].includes(input.amountTaxType))
    fail('amountTaxType must be gross or net.');
  let effective =
    input.effectiveDate === undefined
      ? undefined
      : date(input.effectiveDate, 'Effective date');
  if (effective !== undefined && effective < new Date().toISOString().slice(0, 10))
    fail('Incentive effectiveDate must be today or in the future.');
  let start =
    input.periodStart === undefined ? undefined : date(input.periodStart, 'Period start');
  let end = input.periodEnd === undefined ? undefined : date(input.periodEnd, 'Period end');
  if (start && end && start > end) fail('Period start must not follow period end.');
  return pickDefined({
    amount: input.amount === undefined ? undefined : integer(input.amount, 'Incentive amount'),
    amount_tax_type: input.amountTaxType,
    type: input.type,
    effective_date: effective,
    note: input.note,
    period_start: start,
    period_end: end
  });
}
