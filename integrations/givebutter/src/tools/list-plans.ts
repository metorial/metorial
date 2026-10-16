import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let planSchema = z.object({
  planId: z.string().describe('Unique identifier of the recurring plan'),
  firstName: z.string().nullable().describe('Donor first name'),
  lastName: z.string().nullable().describe('Donor last name'),
  email: z.string().nullable().describe('Donor email'),
  phone: z.string().nullable().describe('Donor phone'),
  frequency: z
    .string()
    .nullable()
    .describe('Plan frequency (e.g. monthly, quarterly, annual)'),
  status: z.string().nullable().describe('Plan status'),
  method: z.string().nullable().describe('Payment method'),
  amount: z.number().nullable().describe('Recurring amount'),
  feeCovered: z.number().nullable().describe('Fee covered by donor'),
  startAt: z.string().nullable().describe('Plan start date'),
  nextBillDate: z.string().nullable().describe('Next billing date'),
  createdAt: z.string().nullable().describe('When the plan was created')
});

let listPlansOutputSchema = z.object({
  plans: z.array(planSchema).describe('List of recurring plans'),
  totalCount: z.number().describe('Total number of plans'),
  currentPage: z.number().describe('Current page'),
  lastPage: z.number().describe('Last page')
});

export let listPlans = SlateTool.create(spec, {
  name: 'List Plans',
  key: 'list_plans',
  description: `Retrieve a paginated list of recurring giving plans (monthly, quarterly, annual subscriptions) with donor and billing information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Items per page, from 1 to 100')
    })
  )
  .output(listPlansOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPlans({ page: ctx.input.page, per_page: ctx.input.perPage });

    let plans = result.data.map((p: any) => ({
      planId: String(p.id),
      firstName: p.first_name,
      lastName: p.last_name,
      email: p.email,
      phone: p.phone,
      frequency: p.frequency,
      status: p.status,
      method: p.method,
      amount: p.amount,
      feeCovered: p.fee_covered,
      startAt: p.start_at,
      nextBillDate: p.next_bill_date,
      createdAt: p.created_at
    }));

    return {
      output: client.output(listPlansOutputSchema, {
        plans,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      }),
      message: client.publicData(
        `Found **${result.meta.total}** recurring plans (page ${result.meta.current_page} of ${result.meta.last_page}).`
      )
    };
  })
  .build();

let getPlanOutputSchema = planSchema;

export let getPlan = SlateTool.create(spec, {
  name: 'Get Plan',
  key: 'get_plan',
  description: `Retrieve detailed information about a specific recurring giving plan including donor details, frequency, amount, and billing schedule.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      planId: z.string().describe('ID of the plan to retrieve')
    })
  )
  .output(getPlanOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let p = await client.getPlan(ctx.input.planId);

    return {
      output: client.output(getPlanOutputSchema, {
        planId: String(p.id),
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email,
        phone: p.phone,
        frequency: p.frequency,
        status: p.status,
        method: p.method,
        amount: p.amount,
        feeCovered: p.fee_covered,
        startAt: p.start_at,
        nextBillDate: p.next_bill_date,
        createdAt: p.created_at
      }),
      message: client.publicData(`Retrieved plan **${p.id}**.`)
    };
  })
  .build();
