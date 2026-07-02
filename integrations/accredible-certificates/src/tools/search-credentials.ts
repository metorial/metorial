import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchCredentials = SlateTool.create(spec, {
  name: 'Search Credentials',
  key: 'search_credentials',
  description: `Search and list credentials with various filters. Filter by group, recipient email, date ranges, and more. Results are paginated.`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'Use pageSize to control how many results are returned per page (default 50).'
  ],
  constraints: ['Maximum page size is 50.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().optional().describe('Filter by credential group ID'),
      email: z.string().optional().describe('Filter by recipient email address'),
      recipientId: z.string().optional().describe('Filter by recipient ID'),
      startDate: z
        .string()
        .optional()
        .describe('Filter credentials issued on or after this date (YYYY-MM-DD)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter credentials issued on or before this date (YYYY-MM-DD)'),
      startUpdatedDate: z
        .string()
        .optional()
        .describe('Filter credentials updated on or after this date (YYYY-MM-DD)'),
      endUpdatedDate: z
        .string()
        .optional()
        .describe('Filter credentials updated on or before this date (YYYY-MM-DD)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (default 50, max 50)'),
      page: z.number().optional().describe('Page number to retrieve')
    })
  )
  .output(
    z.object({
      credentials: z
        .array(
          z.object({
            credentialId: z.string().describe('Credential ID'),
            credentialName: z.string().optional().describe('Credential name'),
            credentialUrl: z.string().optional().describe('Public credential URL'),
            recipientName: z.string().optional().describe('Recipient name'),
            recipientEmail: z.string().optional().describe('Recipient email'),
            groupName: z.string().optional().describe('Group name'),
            groupId: z.number().optional().describe('Group ID'),
            issuedOn: z.string().optional().describe('Issue date'),
            approved: z.boolean().optional().describe('Whether published')
          })
        )
        .describe('List of matching credentials'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages'),
      totalCount: z.number().optional().describe('Total number of matching credentials')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.searchCredentials({
      groupId: ctx.input.groupId,
      email: ctx.input.email,
      recipientId: ctx.input.recipientId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      startUpdatedDate: ctx.input.startUpdatedDate,
      endUpdatedDate: ctx.input.endUpdatedDate,
      pageSize: ctx.input.pageSize,
      page: ctx.input.page
    });

    let credentials = result.credentials.map((c: any) => ({
      credentialId: String(c.id),
      credentialName: c.name,
      credentialUrl: c.url,
      recipientName: c.recipient?.name,
      recipientEmail: c.recipient?.email,
      groupName: c.group_name,
      groupId: c.group_id,
      issuedOn: c.issued_on,
      approved: c.approve
    }));

    return {
      output: {
        credentials,
        currentPage: result.meta?.current_page,
        totalPages: result.meta?.total_pages,
        totalCount: result.meta?.total_count
      },
      message: `Found **${result.meta?.total_count ?? credentials.length}** credentials (page ${result.meta?.current_page || 1} of ${result.meta?.total_pages || 1}).`
    };
  })
  .build();
