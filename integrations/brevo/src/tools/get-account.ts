import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve Brevo account information including company name, email, and plan details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().describe('Account email address'),
      firstName: z.string().optional().describe('Account holder first name'),
      lastName: z.string().optional().describe('Account holder last name'),
      companyName: z.string().optional().describe('Company name'),
      plan: z
        .array(
          z.object({
            type: z.string().optional().describe('Plan type'),
            credits: z.number().optional().describe('Available credits'),
            creditsType: z.string().optional().describe('Credit type')
          })
        )
        .optional()
        .describe('Account plan details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let account = await client.getAccount();

    return {
      output: {
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        companyName: account.companyName,
        plan: account.plan
      },
      message: `Account: **${account.email}** (${account.companyName || 'No company name'})`
    };
  });
