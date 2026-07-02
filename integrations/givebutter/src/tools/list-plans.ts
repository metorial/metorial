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
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      plans: z.array(planSchema).describe('List of recurring plans'),
      totalCount: z.number().describe('Total number of plans'),
      currentPage: z.number().describe('Current page'),
      lastPage: z.number().describe('Last page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPlans({ page: ctx.input.page });

    let plans = result.data.map((p: any) => ({
      planId: String(p.id),
      firstName: p.first_name ?? null,
      lastName: p.last_name ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      frequency: p.frequency ?? null,
      status: p.status ?? null,
      method: p.method ?? null,
      amount: p.amount ?? null,
      feeCovered: p.fee_covered ?? null,
      startAt: p.start_at ?? null,
      nextBillDate: p.next_bill_date ?? null,
      createdAt: p.created_at ?? null
    }));

    return {
      output: {
        plans,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      },
      message: `Found **${result.meta.total}** recurring plans (page ${result.meta.current_page} of ${result.meta.last_page}).`
    };
  })
  .build();

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
  .output(planSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let p = await client.getPlan(ctx.input.planId);

    return {
      output: {
        planId: String(p.id),
        firstName: p.first_name ?? null,
        lastName: p.last_name ?? null,
        email: p.email ?? null,
        phone: p.phone ?? null,
        frequency: p.frequency ?? null,
        status: p.status ?? null,
        method: p.method ?? null,
        amount: p.amount ?? null,
        feeCovered: p.fee_covered ?? null,
        startAt: p.start_at ?? null,
        nextBillDate: p.next_bill_date ?? null,
        createdAt: p.created_at ?? null
      },
      message: `Retrieved plan **${p.id}** — ${p.amount ?? 0} ${p.frequency ?? ''} from ${[p.first_name, p.last_name].filter(Boolean).join(' ') || 'unknown donor'}.`
    };
  })
  .build();
