import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { paypalServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageBillingPlan = SlateTool.create(spec, {
  name: 'Manage Billing Plan',
  key: 'manage_billing_plan',
  description: `Create, retrieve, list, activate, or deactivate PayPal billing plans. Billing plans define pricing and billing cycle details for subscriptions.`,
  instructions: [
    'A catalog product must exist before creating a plan. Use **Manage Product** to create one.',
    'Billing cycles define the pricing schedule. At least one REGULAR cycle is required.',
    'Use **activate** / **deactivate** to toggle plan availability.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'activate', 'deactivate'])
        .describe('Action to perform'),
      planId: z.string().optional().describe('Plan ID (required for get/activate/deactivate)'),
      productId: z.string().optional().describe('Catalog product ID (required for create)'),
      name: z.string().optional().describe('Plan name (required for create)'),
      description: z.string().optional().describe('Plan description'),
      billingCycles: z
        .array(
          z.object({
            intervalUnit: z
              .enum(['DAY', 'WEEK', 'MONTH', 'YEAR'])
              .describe('Billing interval unit'),
            intervalCount: z.number().describe('Number of intervals between billings'),
            tenureType: z.enum(['REGULAR', 'TRIAL']).describe('Type of billing cycle'),
            sequence: z
              .number()
              .describe('Sequence order (1 for first cycle, 2 for second, etc.)'),
            totalCycles: z
              .number()
              .optional()
              .describe('Total number of cycles. 0 = infinite.'),
            price: z.string().describe('Price per cycle as a string (e.g. "9.99")'),
            currencyCode: z.string().describe('Currency code for the price')
          })
        )
        .optional()
        .describe('Billing cycle definitions (required for create)'),
      page: z.number().optional().describe('Page number for listing'),
      pageSize: z.number().optional().describe('Page size for listing')
    })
  )
  .output(
    z.object({
      planId: z.string().optional().describe('Plan ID'),
      status: z.string().optional().describe('Plan status'),
      name: z.string().optional().describe('Plan name'),
      productId: z.string().optional().describe('Associated product ID'),
      plans: z.array(z.any()).optional().describe('List of plans (for list action)'),
      plan: z.any().optional().describe('Full plan details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.productId || !ctx.input.name || !ctx.input.billingCycles) {
          throw paypalServiceError(
            'productId, name, and billingCycles are required for create action'
          );
        }
        let cycles = ctx.input.billingCycles.map(c => ({
          frequency: { interval_unit: c.intervalUnit, interval_count: c.intervalCount },
          tenure_type: c.tenureType,
          sequence: c.sequence,
          total_cycles: c.totalCycles,
          pricing_scheme: { fixed_price: { currency_code: c.currencyCode, value: c.price } }
        }));

        let plan = await client.createPlan({
          productId: ctx.input.productId,
          name: ctx.input.name,
          description: ctx.input.description,
          billingCycles: cycles
        });
        plan = await client.getPlan(plan.id);

        return {
          output: {
            planId: plan.id,
            status: plan.status,
            name: plan.name,
            productId: plan.product_id,
            plan
          },
          message: `Billing plan \`${plan.id}\` created with status **${plan.status}**.`
        };
      }
      case 'get': {
        if (!ctx.input.planId) throw paypalServiceError('planId is required for get action');
        let plan = await client.getPlan(ctx.input.planId);
        return {
          output: {
            planId: plan.id,
            status: plan.status,
            name: plan.name,
            productId: plan.product_id,
            plan
          },
          message: `Plan \`${plan.id}\` (**${plan.name}**) is **${plan.status}**.`
        };
      }
      case 'list': {
        let result = await client.listPlans({
          productId: ctx.input.productId,
          page: ctx.input.page,
          pageSize: ctx.input.pageSize,
          totalRequired: true
        });
        let plans = (result.plans || []) as any[];
        return {
          output: {
            plans: plans.map((p: any) => ({
              planId: p.id,
              status: p.status,
              name: p.name,
              productId: p.product_id
            }))
          },
          message: `Found ${plans.length} billing plan(s).`
        };
      }
      case 'activate': {
        if (!ctx.input.planId)
          throw paypalServiceError('planId is required for activate action');
        await client.activatePlan(ctx.input.planId);
        return {
          output: { planId: ctx.input.planId, status: 'ACTIVE' },
          message: `Plan \`${ctx.input.planId}\` activated.`
        };
      }
      case 'deactivate': {
        if (!ctx.input.planId)
          throw paypalServiceError('planId is required for deactivate action');
        await client.deactivatePlan(ctx.input.planId);
        return {
          output: { planId: ctx.input.planId, status: 'INACTIVE' },
          message: `Plan \`${ctx.input.planId}\` deactivated.`
        };
      }
    }
  })
  .build();
