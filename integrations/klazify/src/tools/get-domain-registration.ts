import { SlateTool } from 'slates';
import { z } from 'zod';
import { KlazifyClient } from '../lib/client';
import { spec } from '../spec';

export let getDomainRegistration = SlateTool.create(spec, {
  name: 'Get Domain Registration',
  key: 'get_domain_registration',
  description: `Returns domain registration information including domain age, registration date, expiration date, and days until expiration. Useful for monitoring domain renewals and assessing domain credibility.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL or domain to look up registration data for')
    })
  )
  .output(
    z.object({
      domainAgeDate: z
        .string()
        .nullable()
        .describe('Domain original registration date (YYYY-MM-DD)'),
      domainAgeDaysAgo: z
        .string()
        .nullable()
        .describe('Number of days since domain was registered'),
      domainExpirationDate: z
        .string()
        .nullable()
        .describe('Domain expiration date (YYYY-MM-DD)'),
      domainExpirationDaysLeft: z
        .string()
        .nullable()
        .describe('Number of days until domain expires')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KlazifyClient({ token: ctx.auth.token });
    let result = await client.domainExpiration(ctx.input.url);

    let reg = result.domain_registration_data ?? {};

    let output = {
      domainAgeDate: reg.domain_age_date ?? null,
      domainAgeDaysAgo: reg.domain_age_days_ago ?? null,
      domainExpirationDate: reg.domain_expiration_date ?? null,
      domainExpirationDaysLeft: reg.domain_expiration_days_left ?? null
    };

    return {
      output,
      message: output.domainAgeDate
        ? `**${ctx.input.url}** was registered on **${output.domainAgeDate}** (${output.domainAgeDaysAgo} days ago). Expires **${output.domainExpirationDate}** (${output.domainExpirationDaysLeft} days left).`
        : `No domain registration data found for **${ctx.input.url}**.`
    };
  })
  .build();
