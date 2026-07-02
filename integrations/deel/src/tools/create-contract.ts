import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let createContract = SlateTool.create(spec, {
  name: 'Create Contract',
  key: 'create_contract',
  description: `Create a new contractor contract in Deel. Supports fixed rate, pay-as-you-go (fixed and task-based), and milestone-based contracts. Provide the contract type, worker details, compensation, and start date.`,
  instructions: [
    'Use type "ongoing_time_based" for fixed rate contracts, "pay_as_you_go_time_based" for hourly PAYG, "payg_milestones" for milestone-based, "payg_task" for task-based.',
    'The worker email must be unique in the organization. If the email already exists, the contract will be linked to the existing worker profile.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      type: z
        .string()
        .describe(
          'Contract type: "ongoing_time_based", "pay_as_you_go_time_based", "payg_milestones", or "payg_task"'
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
      noticePeriod: z.number().optional().describe('Notice period in days')
    })
  )
  .output(
    z.object({
      contract: z.record(z.string(), z.any()).describe('The created contract')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {
      type: ctx.input.type,
      title: ctx.input.title,
      start_date: ctx.input.startDate,
      worker: {
        expected_email: ctx.input.workerEmail,
        first_name: ctx.input.workerFirstName,
        last_name: ctx.input.workerLastName
      }
    };

    if (ctx.input.endDate) data.termination_date = ctx.input.endDate;
    if (ctx.input.scopeOfWork) data.scope_of_work = ctx.input.scopeOfWork;
    if (ctx.input.countryCode) data.country_code = ctx.input.countryCode;
    if (ctx.input.stateCode) data.state_code = ctx.input.stateCode;
    if (ctx.input.specialClause) data.special_clause = ctx.input.specialClause;
    if (ctx.input.noticePeriod !== undefined) data.notice_period = ctx.input.noticePeriod;

    if (
      ctx.input.amount !== undefined ||
      ctx.input.currencyCode ||
      ctx.input.scale ||
      ctx.input.frequency
    ) {
      data.compensation_details = {};
      if (ctx.input.amount !== undefined) data.compensation_details.amount = ctx.input.amount;
      if (ctx.input.currencyCode)
        data.compensation_details.currency_code = ctx.input.currencyCode;
      if (ctx.input.scale) data.compensation_details.scale = ctx.input.scale;
      if (ctx.input.frequency) data.compensation_details.frequency = ctx.input.frequency;
    }

    if (ctx.input.legalEntityId || ctx.input.teamId) {
      data.client = {};
      if (ctx.input.legalEntityId) data.client.legal_entity = { id: ctx.input.legalEntityId };
      if (ctx.input.teamId) data.client.team = { id: ctx.input.teamId };
    }

    let result = await client.createContract(data);
    let contract = result?.data ?? result;

    return {
      output: { contract },
      message: `Created contract **${ctx.input.title}** for **${ctx.input.workerFirstName} ${ctx.input.workerLastName}**.`
    };
  })
  .build();
