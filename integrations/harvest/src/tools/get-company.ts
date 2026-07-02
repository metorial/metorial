import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve company-level settings from Harvest including timezone, currency, time tracking preferences, and plan details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      baseUri: z.string().optional().describe('Base URI of the company'),
      fullDomain: z.string().optional().describe('Full domain name'),
      name: z.string().optional().describe('Company name'),
      isActive: z.boolean().optional().describe('Whether the account is active'),
      weekStartDay: z.string().optional().describe('Day of the week the work week starts'),
      wantsTimestampTimers: z
        .boolean()
        .optional()
        .describe('Whether timestamp timers are enabled'),
      timeFormat: z.string().optional().describe('Time format (decimal or hours_minutes)'),
      planType: z.string().optional().describe('Harvest plan type'),
      clock: z.string().optional().describe('Clock format (12h or 24h)'),
      currency: z.string().optional().describe('Default currency'),
      currencySymbol: z.string().optional().describe('Currency symbol'),
      decimalSymbol: z.string().optional().describe('Decimal symbol'),
      thousandsSeparator: z.string().optional().describe('Thousands separator'),
      colorScheme: z.string().optional().describe('Color scheme'),
      expenseFeature: z.boolean().optional().describe('Whether expense tracking is enabled'),
      invoiceFeature: z.boolean().optional().describe('Whether invoicing is enabled'),
      estimateFeature: z.boolean().optional().describe('Whether estimates are enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let company = await client.getCompany();

    return {
      output: {
        baseUri: company.base_uri,
        fullDomain: company.full_domain,
        name: company.name,
        isActive: company.is_active,
        weekStartDay: company.week_start_day,
        wantsTimestampTimers: company.wants_timestamp_timers,
        timeFormat: company.time_format,
        planType: company.plan_type,
        clock: company.clock,
        currency: company.currency,
        currencySymbol: company.currency_symbol,
        decimalSymbol: company.decimal_symbol,
        thousandsSeparator: company.thousands_separator,
        colorScheme: company.color_scheme,
        expenseFeature: company.expense_feature,
        invoiceFeature: company.invoice_feature,
        estimateFeature: company.estimate_feature
      },
      message: `Company **${company.name}** — ${company.plan_type} plan, currency: ${company.currency}.`
    };
  })
  .build();
