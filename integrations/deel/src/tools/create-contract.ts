import { anyOf, createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  dataObject,
  requireDate,
  requireNumber,
  requireText,
  resourceSchema
} from '../lib/response';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let createContract = SlateTool.create(spec, {
  name: 'Create Contract',
  key: 'create_contract',
  description: `Create a new contractor contract in Deel. Supports fixed rate, pay-as-you-go (fixed and task-based), and milestone-based contracts. Provide the contract type, worker details, compensation, and start date.`,
  instructions: [
    'Use type "ongoing_time_based" for fixed rate contracts, "pay_as_you_go_time_based" for hourly PAYG, "payg_milestones" for milestone-based, "payg_tasks" for task-based (legacy "payg_task" is also accepted).',
    'The worker email must be unique in the organization. If the email already exists, the contract will be linked to the existing worker profile.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(anyOf('contracts:write'))
  .input(
    z.object({
      type: z
        .string()
        .describe(
          'Contract type: "ongoing_time_based", "pay_as_you_go_time_based", "payg_milestones", or "payg_tasks"'
        ),
      title: z.string().describe('Title of the contract'),
      workerEmail: z.string().describe('Email address of the contractor'),
      workerFirstName: z.string().describe('First name of the contractor'),
      workerLastName: z.string().describe('Last name of the contractor'),
      startDate: z.string().describe('Contract start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Contract end date (YYYY-MM-DD)'),
      scopeOfWork: z.string().optional().describe('Description of the scope of work'),
      countryCode: z.string().optional().describe('Country code (e.g. "US")'),
      stateCode: z.string().optional().describe('State code (e.g. "CA")'),
      currencyCode: z.string().optional().describe('Currency code (e.g. "USD")'),
      amount: z.number().optional().describe('Compensation amount'),
      scale: z.string().optional().describe('Rate scale: "monthly", "weekly", "hourly"'),
      frequency: z
        .string()
        .optional()
        .describe('Payment frequency: "monthly", "weekly", "semi_monthly"'),
      legalEntityId: z
        .string()
        .optional()
        .describe('Legal entity ID to associate the contract with'),
      teamId: z.string().optional().describe('Team/group ID to associate the contract with'),
      specialClause: z.string().optional().describe('Special clause for the contract'),
      noticePeriod: z.number().optional().describe('Notice period in days'),
      documentsRequired: z
        .boolean()
        .optional()
        .describe(
          'Required for create: explicitly choose whether compliance documents are required'
        ),
      paymentPolicyId: z
        .string()
        .optional()
        .describe(
          'Configured payment policy ID, mutually exclusive with individual payment schedule fields; unavailable for milestones'
        ),
      cycleEnd: z.number().optional().describe('Invoice cycle end day, 1–31'),
      cycleEndType: z
        .enum(['DAY_OF_WEEK', 'DAY_OF_LAST_WEEK', 'DAY_OF_MONTH'])
        .optional()
        .describe('How cycleEnd is interpreted'),
      paymentDueType: z
        .enum(['REGULAR', 'WITHIN_MONTH', 'AFTER_MONTH', 'BEFORE_CYCLE_END'])
        .optional(),
      paymentDueDays: z.number().optional().describe('Days until payment is due, 0–90')
    })
  )
  .output(
    z.object({
      contract: resourceSchema.describe('The created contract')
    })
  )
  .handleInvocation(async ctx => {
    let type = ctx.input.type === 'payg_task' ? 'payg_tasks' : ctx.input.type;
    if (
      ![
        'ongoing_time_based',
        'pay_as_you_go_time_based',
        'payg_milestones',
        'payg_tasks'
      ].includes(type)
    )
      throw createApiServiceError(
        'Use a supported contractor contract type. EOR and employee hiring are separate workflows.'
      );
    requireText(ctx.input.title, 'title');
    requireText(ctx.input.workerEmail, 'workerEmail');
    requireText(ctx.input.workerFirstName, 'workerFirstName');
    requireText(ctx.input.workerLastName, 'workerLastName');
    if (!z.email().safeParse(ctx.input.workerEmail).success)
      throw createApiServiceError('workerEmail must be a valid email address.');
    requireDate(ctx.input.startDate, 'startDate');
    if (ctx.input.endDate !== undefined) {
      requireDate(ctx.input.endDate, 'endDate');
      if (ctx.input.endDate < ctx.input.startDate)
        throw createApiServiceError('endDate cannot precede startDate.');
    }
    requireText(ctx.input.legalEntityId, 'legalEntityId from list_organization_data');
    requireText(ctx.input.teamId, 'teamId from list_organization_data');
    if (ctx.input.documentsRequired === undefined)
      throw createApiServiceError(
        'Explicitly set documentsRequired to choose the contract compliance-document policy.'
      );
    let currency = requireText(ctx.input.currencyCode, 'currencyCode');
    if (!/^[A-Z]{3}$/.test(currency))
      throw createApiServiceError(
        'currencyCode must be an uppercase three-letter ISO currency code.'
      );
    if (ctx.input.countryCode !== undefined && !/^[A-Z]{2}$/.test(ctx.input.countryCode))
      throw createApiServiceError(
        'countryCode must be an uppercase two-letter ISO country code.'
      );
    if (ctx.input.noticePeriod !== undefined)
      requireNumber(ctx.input.noticePeriod, 'noticePeriod');
    if (ctx.input.amount !== undefined) requireNumber(ctx.input.amount, 'amount');
    if (['ongoing_time_based', 'pay_as_you_go_time_based'].includes(type)) {
      requireNumber(ctx.input.amount, 'amount');
      requireText(ctx.input.scale, 'scale');
    }
    if (
      ctx.input.scale !== undefined &&
      !['hourly', 'daily', 'weekly', 'monthly', 'biweekly', 'semimonthly', 'custom'].includes(
        ctx.input.scale
      )
    )
      throw createApiServiceError('Use a documented compensation scale.');
    let frequency =
      ctx.input.frequency === 'semi_monthly' ? 'semimonthly' : ctx.input.frequency;
    if (
      frequency !== undefined &&
      !['weekly', 'monthly', 'biweekly', 'semimonthly', 'calendar-month'].includes(frequency)
    )
      throw createApiServiceError('Use a documented payment frequency.');
    let schedule = [
      frequency,
      ctx.input.cycleEnd,
      ctx.input.cycleEndType,
      ctx.input.paymentDueType,
      ctx.input.paymentDueDays
    ];
    if (ctx.input.paymentPolicyId !== undefined) {
      requireText(ctx.input.paymentPolicyId, 'paymentPolicyId');
      if (type === 'payg_milestones' || schedule.some(value => value !== undefined))
        throw createApiServiceError(
          'Use either a payment policy or the complete individual payment schedule. Milestones require individual schedule fields.'
        );
    } else if (schedule.some(value => value === undefined))
      throw createApiServiceError(
        'Provide the complete payment schedule (frequency,cycleEnd,cycleEndType,paymentDueType,paymentDueDays), or paymentPolicyId where supported.'
      );
    if (
      ctx.input.cycleEnd !== undefined &&
      (!Number.isSafeInteger(ctx.input.cycleEnd) ||
        ctx.input.cycleEnd < 1 ||
        ctx.input.cycleEnd > (ctx.input.cycleEndType === 'DAY_OF_WEEK' ? 7 : 31))
    )
      throw createApiServiceError(
        'cycleEnd must be a valid integer day for the selected cycleEndType.'
      );
    if (
      ctx.input.paymentDueDays !== undefined &&
      (!Number.isSafeInteger(ctx.input.paymentDueDays) ||
        ctx.input.paymentDueDays < 0 ||
        ctx.input.paymentDueDays > 90)
    )
      throw createApiServiceError('paymentDueDays must be an integer between 0 and 90.');
    let client = createClient(ctx);
    let data = pickDefined({
      type,
      title: ctx.input.title,
      start_date: ctx.input.startDate,
      termination_date: ctx.input.endDate,
      worker: {
        expected_email: ctx.input.workerEmail,
        first_name: ctx.input.workerFirstName,
        last_name: ctx.input.workerLastName
      },
      client: {
        legal_entity: { id: ctx.input.legalEntityId },
        team: { id: ctx.input.teamId }
      },
      meta: { documents_required: ctx.input.documentsRequired },
      scope_of_work: ctx.input.scopeOfWork,
      country_code: ctx.input.countryCode,
      state_code: ctx.input.stateCode,
      special_clause: ctx.input.specialClause,
      notice_period: ctx.input.noticePeriod,
      compensation_details: pickDefined({
        amount: ctx.input.amount,
        currency_code: currency,
        scale: ctx.input.scale,
        frequency,
        payment_policy_id: ctx.input.paymentPolicyId,
        cycle_end: ctx.input.cycleEnd,
        cycle_end_type: ctx.input.cycleEndType,
        payment_due_type: ctx.input.paymentDueType,
        payment_due_days: ctx.input.paymentDueDays
      })
    });
    let contract = dataObject(await client.createContract(data), 'created contract');
    requireText(contract.id, 'Created contract ID');
    return {
      output: { contract },
      message: `Created contract **${ctx.input.title}** for **${ctx.input.workerFirstName} ${ctx.input.workerLastName}**.`
    };
  })
  .build();
