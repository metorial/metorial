import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve the current company's profile and statistics. Returns company details along with payment stats for the last 30 days.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeStats: z
        .boolean()
        .optional()
        .describe('Also fetch payment statistics (default: false)')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('Company identifier'),
      name: z.string().describe('Company display name'),
      legalName: z.string().nullable().describe('Legal name on receipts'),
      slug: z.string().describe('URL-friendly company identifier'),
      countryCode: z.string().describe('Country code'),
      currency: z.string().describe('Default currency'),
      stripeConnected: z.boolean().describe('Whether Stripe is connected'),
      gocardlessConnected: z.boolean().describe('Whether GoCardless is connected'),
      vatRegistered: z.boolean().describe('Whether VAT registered'),
      vatRate: z.string().nullable().describe('VAT rate percentage'),
      plan: z.string().describe('Payhere plan tier'),
      subscriptionStatus: z.string().describe('Payhere subscription status'),
      supportEmail: z.string().nullable().describe('Support email'),
      website: z.string().nullable().describe('Company website'),
      address: z.string().nullable().describe('Company address'),
      createdAt: z.string(),
      updatedAt: z.string(),
      stats: z
        .object({
          currency: z.string(),
          paymentsLast30: z.number().describe('Payment total for last 30 days'),
          paymentsComparison: z.number().describe('Payment total for 30-60 days ago'),
          subscribersLast30: z.number().describe('New subscribers in last 30 days'),
          subscribersComparison: z.number().describe('New subscribers 30-60 days ago'),
          paymentsAllTime: z.number().describe('All-time payment total')
        })
        .nullable()
        .describe('Payment statistics (when includeStats is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayhereClient({ token: ctx.auth.token });

    let company = await client.getCompany();
    let stats = ctx.input.includeStats ? await client.getCompanyStats() : null;

    return {
      output: {
        ...company,
        stats
      },
      message: `Company **${company.name}** (${company.currency.toUpperCase()})${stats ? ` — ${stats.paymentsAllTime} all-time payments, ${stats.subscribersLast30} new subscribers in last 30 days` : ''}.`
    };
  })
  .build();
