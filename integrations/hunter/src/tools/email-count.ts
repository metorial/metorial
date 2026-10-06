import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, optionalNumber, optionalRow, row } from '../lib/client';
import { spec } from '../spec';

export let emailCount = SlateTool.create(spec, {
  name: 'Email Count',
  key: 'email_count',
  description: `Get the count of email addresses available for a domain or company. Returns a breakdown by personal vs. generic emails, by department, and by seniority level. This is a free call useful for estimating data availability before using credits.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .describe('Domain name to count emails for (e.g., "stripe.com")'),
      companyName: z.string().optional().describe('Company name to count emails for'),
      type: z.enum(['personal', 'generic']).optional().describe('Filter by email type')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of email addresses found'),
      personalEmails: z.number().describe('Number of personal email addresses'),
      genericEmails: z.number().describe('Number of generic email addresses'),
      departments: z
        .array(
          z.object({
            department: z.string().describe('Department name'),
            count: z.number().describe('Number of emails in this department')
          })
        )
        .optional()
        .describe('Breakdown by department'),
      seniorities: z
        .array(
          z.object({
            seniority: z.string().describe('Seniority level'),
            count: z.number().describe('Number of emails at this seniority level')
          })
        )
        .optional()
        .describe('Breakdown by seniority level')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).getEmailCount({
      domain: ctx.input.domain,
      company: ctx.input.companyName,
      type: ctx.input.type
    });
    const data = row(result.data);
    const count = (value: unknown) => {
      const result = optionalNumber(value);
      if (result === undefined)
        throw createApiServiceError('Hunter omitted required count metadata.');
      return result;
    };
    const departments = Object.entries(optionalRow(data.department)).map(
      ([department, value]) => ({ department, count: count(value) })
    );
    const seniorities = Object.entries(optionalRow(data.seniority)).map(
      ([seniority, value]) => ({ seniority, count: count(value) })
    );
    return {
      output: {
        total: count(data.total),
        personalEmails: count(data.personal_emails),
        genericEmails: count(data.generic_emails),
        departments,
        seniorities
      },
      message: `Hunter reports **${count(data.total)}** available email addresses.`
    };
  })
  .build();
