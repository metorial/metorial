import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve the authenticated user's account information including profile details, usage statistics, and account limits.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      username: z.string().describe('Account username'),
      name: z.string().describe('Display name'),
      email: z.string().describe('Account email'),
      accountType: z.string().describe('Account plan type'),
      status: z.string().describe('Account status'),
      createdAt: z.string().describe('Account creation date'),
      usage: z
        .object({
          submissions: z.number().optional().describe('Number of submissions used'),
          sslSubmissions: z.number().optional().describe('Number of SSL submissions'),
          paymentSubmissions: z.number().optional().describe('Number of payment submissions'),
          uploads: z.number().optional().describe('Upload space used in bytes')
        })
        .optional()
        .describe('Account usage statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let user = await client.getUser();
    let usage = await client.getUserUsage();

    return {
      output: {
        username: user.username || '',
        name: user.name || '',
        email: user.email || '',
        accountType: user.account_type || '',
        status: user.status || '',
        createdAt: user.created_at || '',
        usage: usage
          ? {
              submissions: usage.submissions ? Number(usage.submissions) : undefined,
              sslSubmissions: usage.ssl_submissions
                ? Number(usage.ssl_submissions)
                : undefined,
              paymentSubmissions: usage.payment_submissions
                ? Number(usage.payment_submissions)
                : undefined,
              uploads: usage.uploads ? Number(usage.uploads) : undefined
            }
          : undefined
      },
      message: `Account **${user.username}** (${user.email}) — ${user.account_type} plan.`
    };
  })
  .build();
