import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Get your DigitalOcean account information including email, Droplet limit, billing status, and team details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().describe('Account email'),
      uuid: z.string().describe('Account UUID'),
      name: z.string().optional().describe('Account name'),
      dropletLimit: z.number().describe('Maximum number of Droplets allowed'),
      volumeLimit: z.number().describe('Maximum number of volumes allowed'),
      emailVerified: z.boolean().describe('Whether email is verified'),
      status: z.string().describe('Account status'),
      team: z
        .object({
          name: z.string().describe('Team name'),
          uuid: z.string().describe('Team UUID')
        })
        .optional()
        .describe('Team details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let account = await client.getAccount();

    return {
      output: {
        email: account.email,
        uuid: account.uuid,
        name: account.name,
        dropletLimit: account.droplet_limit,
        volumeLimit: account.volume_limit,
        emailVerified: account.email_verified,
        status: account.status,
        team: account.team
          ? {
              name: account.team.name,
              uuid: account.team.uuid
            }
          : undefined
      },
      message: `Account **${account.email}** — Status: ${account.status}, Droplet limit: ${account.droplet_limit}.`
    };
  })
  .build();

export let getBilling = SlateTool.create(spec, {
  name: 'Get Billing',
  key: 'get_billing',
  description: `Get your current DigitalOcean account balance and billing history. Shows month-to-date usage, balance, and recent invoices.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeHistory: z.boolean().optional().describe('Include billing history entries'),
      page: z.number().optional().describe('Page for billing history'),
      perPage: z.number().optional().describe('Results per page for billing history')
    })
  )
  .output(
    z.object({
      monthToDateBalance: z.string().describe('Current month-to-date balance'),
      accountBalance: z.string().describe('Account balance'),
      monthToDateUsage: z.string().describe('Current month usage'),
      generatedAt: z.string().describe('When the balance was generated'),
      billingHistory: z
        .array(
          z.object({
            description: z.string().describe('Billing entry description'),
            amount: z.string().describe('Amount'),
            invoiceId: z.string().optional().describe('Invoice ID'),
            date: z.string().describe('Entry date')
          })
        )
        .optional()
        .describe('Billing history entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let balance = await client.getBalance();

    let billingHistory: any[] | undefined;
    if (ctx.input.includeHistory) {
      let result = await client.getBillingHistory({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      billingHistory = result.billingHistory.map((h: any) => ({
        description: h.description,
        amount: h.amount,
        invoiceId: h.invoice_id,
        date: h.date
      }));
    }

    return {
      output: {
        monthToDateBalance: balance.month_to_date_balance,
        accountBalance: balance.account_balance,
        monthToDateUsage: balance.month_to_date_usage,
        generatedAt: balance.generated_at,
        billingHistory
      },
      message: `Account balance: **$${balance.account_balance}**, Month-to-date usage: **$${balance.month_to_date_usage}**.`
    };
  })
  .build();
