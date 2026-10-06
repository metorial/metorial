import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

const balanceSchema = z.object({ remaining: z.number(), total: z.number() });
const cycleSchema = z.object({ start: z.number(), end: z.number() });
const planSchema = z.object({
  object: z.string(),
  plan: z.string(),
  billingCycle: cycleSchema,
  balance: balanceSchema
});
const billingSchema = z.object({
  billingType: z.string(),
  data: z.object({
    plan: z.string().optional(),
    billingMode: z.string().optional(),
    role: z.string().optional(),
    billingCycle: cycleSchema.optional(),
    balance: balanceSchema.optional(),
    onDemand: z
      .object({
        balance: z.number(),
        blocks: z
          .array(
            z.object({
              expirationDate: z.number().optional(),
              effectiveDate: z.number(),
              originalBalance: z.number(),
              currentBalance: z.number()
            })
          )
          .optional()
      })
      .optional(),
    remaining: z.number().optional(),
    reset: z.number().optional(),
    limit: z.number().optional()
  })
});
const safeAccountData = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw createApiServiceError('v0 returned unexpected account data.');
  return parsed.data;
};

export let getAccountInfoTool = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve information about the authenticated V0 user including their profile, current subscription plan, and billing usage.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeBilling: z.boolean().optional().describe('Also fetch billing usage information'),
      includePlan: z.boolean().optional().describe('Also fetch subscription plan details')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User identifier'),
      name: z.string().optional().describe('User full name'),
      email: z.string().describe('User email address'),
      avatar: z.string().optional().describe('URL to user avatar image'),
      createdAt: z.string().optional().describe('Account creation timestamp'),
      billing: z.any().optional().describe('Billing usage and quota information'),
      plan: z.any().optional().describe('Current subscription plan details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let user = await client.getUser();

    let billing: Record<string, unknown> | undefined;
    let plan: Record<string, unknown> | undefined;

    if (ctx.input.includeBilling) {
      billing = safeAccountData(billingSchema, await client.getBilling());
    }
    if (ctx.input.includePlan) {
      plan = safeAccountData(planSchema, await client.getPlan());
    }

    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
        billing,
        plan
      },
      message: `Retrieved account info for **${user.name || user.email}**.`
    };
  })
  .build();
