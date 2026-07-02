import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let reportSchema = z.object({
  reportedAt: z.string().describe('Timestamp when the report was submitted'),
  comment: z.string().describe('Description of the abuse'),
  categories: z.array(z.number()).describe('Abuse category IDs'),
  reporterId: z.number().describe('ID of the reporter'),
  reporterCountryCode: z.string().describe('Country code of the reporter'),
  reporterCountryName: z.string().describe('Country name of the reporter')
});

export let getIpReports = SlateTool.create(spec, {
  name: 'Get IP Reports',
  key: 'get_ip_reports',
  description: `Retrieve detailed, paginated abuse reports for a specific IP address. Each report includes the reporter's information, abuse categories, comments, and timestamps.

Use this for in-depth investigation of abuse activity against a specific IP.`,
  instructions: [
    'Results are paginated. Use the page and perPage parameters to navigate through results.',
    'Maximum of 100 results per page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('IPv4 or IPv6 address to get reports for'),
      maxAgeInDays: z
        .number()
        .min(1)
        .max(365)
        .optional()
        .describe('Lookback window in days (1–365, default 30)'),
      page: z.number().min(1).optional().describe('Page number for pagination (default 1)'),
      perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of reports per page (1–100, default 25)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of reports matching the query'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of reports per page'),
      lastPage: z.number().describe('Last available page number'),
      nextPageUrl: z.string().nullable().describe('URL for the next page of results'),
      previousPageUrl: z.string().nullable().describe('URL for the previous page of results'),
      reports: z.array(reportSchema).describe('List of abuse reports')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getReports({
      ipAddress: ctx.input.ipAddress,
      maxAgeInDays: ctx.input.maxAgeInDays,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let data = result.data;

    return {
      output: {
        total: data.total,
        page: data.page,
        perPage: data.perPage,
        lastPage: data.lastPage,
        nextPageUrl: data.nextPageUrl ?? null,
        previousPageUrl: data.previousPageUrl ?? null,
        reports: data.results ?? []
      },
      message: `Found **${data.total}** reports for **${ctx.input.ipAddress}**. Showing page ${data.page} of ${data.lastPage} (${(data.results ?? []).length} results).`
    };
  })
  .build();
