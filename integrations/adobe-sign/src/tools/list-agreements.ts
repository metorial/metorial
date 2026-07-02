import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAgreements = SlateTool.create(spec, {
  name: 'List Agreements',
  key: 'list_agreements',
  description: `List agreements in the account with optional filtering. Returns a paginated list of agreements with their basic details and current status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response to get the next page'),
      pageSize: z.number().optional().describe('Number of agreements per page (max 100)'),
      externalId: z.string().optional().describe('Filter by external ID'),
      groupId: z.string().optional().describe('Filter by group ID')
    })
  )
  .output(
    z.object({
      agreements: z
        .array(
          z.object({
            agreementId: z.string().describe('ID of the agreement'),
            name: z.string().describe('Name of the agreement'),
            status: z.string().describe('Current status'),
            displayDate: z.string().optional().describe('Display date'),
            esign: z.boolean().optional().describe('Whether the agreement uses e-signatures')
          })
        )
        .describe('List of agreements'),
      cursor: z.string().optional().describe('Cursor for next page, if more results exist'),
      totalHits: z.number().optional().describe('Total number of matching agreements')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.listAgreements({
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      externalId: ctx.input.externalId,
      groupId: ctx.input.groupId
    });

    let agreements = (result.userAgreementList || []).map((a: any) => ({
      agreementId: a.id,
      name: a.name,
      status: a.status,
      displayDate: a.displayDate,
      esign: a.esign
    }));

    return {
      output: {
        agreements,
        cursor: result.page?.nextCursor,
        totalHits: result.page?.totalHits
      },
      message: `Found **${agreements.length}** agreements.${result.page?.nextCursor ? ' More results available with pagination cursor.' : ''}`
    };
  });
