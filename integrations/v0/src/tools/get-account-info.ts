import { SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

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

    let billing: any;
    let plan: any;

    if (ctx.input.includeBilling) {
      billing = await client.getBilling();
    }
    if (ctx.input.includePlan) {
      plan = await client.getPlan();
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
