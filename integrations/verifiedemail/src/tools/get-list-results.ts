import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getListResults = SlateTool.create(spec, {
  name: 'Get List Results',
  key: 'get_list_results',
  description: `Retrieve verification results for an email list. Returns individual email verification results with deliverability status, scores, and detection flags.

Results can be filtered by status to retrieve only deliverable, undeliverable, risky, or unknown emails.`,
  instructions: [
    'The list must have been verified before results are available.',
    'Use the status filter to retrieve only specific categories of results.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the email list to get results for'),
      status: z
        .enum(['deliverable', 'undeliverable', 'risky', 'unknown'])
        .optional()
        .describe('Filter results by verification status'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      limit: z.number().optional().describe('Number of results per page (default: 50)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            email: z.string().describe('The verified email address'),
            status: z.string().describe('Verification status'),
            subStatus: z.string().describe('Detailed sub-status'),
            domain: z.string().describe('Domain of the email address'),
            domainType: z.string().describe('Type of domain'),
            isRole: z.boolean().describe('Whether the address is role-based'),
            isFree: z.boolean().describe('Whether the address uses a free provider'),
            isDisposable: z.boolean().describe('Whether the address is disposable'),
            deliverabilityScore: z.number().describe('Deliverability score from 0 to 100'),
            mxRecords: z.array(z.string()).describe('MX records for the domain'),
            smtpProvider: z.string().describe('Detected SMTP provider'),
            suggestion: z
              .string()
              .nullable()
              .describe('Suggested correction for misspelled domains')
          })
        )
        .describe('Array of verification results'),
      total: z.number().describe('Total number of results matching the filter')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getListResults(ctx.input.listId, {
      status: ctx.input.status,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let filterDesc = ctx.input.status ? ` (filtered by **${ctx.input.status}**)` : '';
    return {
      output: result,
      message: `Retrieved **${result.results.length}** of **${result.total}** verification result(s) for list \`${ctx.input.listId}\`${filterDesc}.`
    };
  })
  .build();
