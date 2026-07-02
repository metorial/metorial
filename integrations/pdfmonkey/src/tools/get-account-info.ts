import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve information about the authenticated PDFMonkey account, including available document quota, current plan, workspace ID, and user details. Useful for checking remaining quota or discovering your workspace ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('ID of the authenticated user'),
      email: z.string().describe('User email address'),
      name: z.string().nullable().describe('User display name'),
      currentPlan: z.string().describe('Current subscription plan name'),
      currentPlanInterval: z
        .string()
        .nullable()
        .describe('Plan billing interval (month/year)'),
      availableDocuments: z.number().describe('Number of documents remaining in quota'),
      payingCustomer: z.boolean().describe('Whether the user is on a paid plan'),
      shareLinksEnabled: z.boolean().describe('Whether share links feature is available'),
      trialEndsOn: z.string().nullable().describe('Trial end date if applicable'),
      createdAt: z.string().describe('Account creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getCurrentUser();

    let output = {
      userId: String(user.id),
      email: String(user.email),
      name: user.desired_name ? String(user.desired_name) : null,
      currentPlan: String(user.current_plan),
      currentPlanInterval: user.current_plan_interval
        ? String(user.current_plan_interval)
        : null,
      availableDocuments: Number(user.available_documents),
      payingCustomer: Boolean(user.paying_customer),
      shareLinksEnabled: Boolean(user.share_links),
      trialEndsOn: user.trial_ends_on ? String(user.trial_ends_on) : null,
      createdAt: String(user.created_at)
    };

    return {
      output,
      message: `Account **${output.email}** on **${output.currentPlan}** plan with **${output.availableDocuments}** documents remaining.`
    };
  })
  .build();
