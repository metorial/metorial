import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getEmailCount({
      domain: ctx.input.domain,
      company: ctx.input.companyName,
      type: ctx.input.type
    });

    let data = result.data;

    let departments = Object.entries(data.department || {}).map(([department, count]) => ({
      department,
      count: count as number
    }));

    let seniorities = Object.entries(data.seniority || {}).map(([seniority, count]) => ({
      seniority,
      count: count as number
    }));

    return {
      output: {
        total: data.total ?? 0,
        personalEmails: data.personal_emails ?? 0,
        genericEmails: data.generic_emails ?? 0,
        departments,
        seniorities
      },
      message: `Found **${data.total ?? 0}** email addresses for **${ctx.input.domain || ctx.input.companyName}** (${data.personal_emails ?? 0} personal, ${data.generic_emails ?? 0} generic).`
    };
  })
  .build();
