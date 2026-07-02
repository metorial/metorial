import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountTool = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account',
  description: `Retrieve your ClickSend account details including balance, user information, and allowed email addresses. Useful for checking available funds, verifying account settings, or finding email address IDs needed for sending emails.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Account user ID'),
      username: z.string().describe('API username'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Account email'),
      balance: z.number().describe('Current account balance'),
      country: z.string().optional().describe('Account country'),
      phoneNumber: z.string().optional().describe('Account phone number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let account = await client.getAccount();

    return {
      output: {
        userId: account.user_id?.toString() || '',
        username: account.username || '',
        firstName: account.first_name || undefined,
        lastName: account.last_name || undefined,
        email: account.user_email || undefined,
        balance: Number.parseFloat(account.balance) || 0,
        country: account.country || undefined,
        phoneNumber: account.phone_number || undefined
      },
      message: `Account **${account.username}** — balance: **$${Number.parseFloat(account.balance || 0).toFixed(2)}**`
    };
  })
  .build();
