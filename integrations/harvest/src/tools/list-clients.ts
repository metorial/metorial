import { SlateTool } from 'slates';
import { z } from 'zod';
import { harvestAccountIdSchema, resolveHarvestAccountId } from '../lib/account-id';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `Retrieve clients with optional filtering by active status. Returns client details including name, address, and currency. Call list_accounts to discover account IDs when choosing between multiple accounts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: harvestAccountIdSchema,
      isActive: z.boolean().optional().describe('Filter by active status'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor returned as nextCursor by the previous call'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max 2000)')
    })
  )
  .output(
    z.object({
      clients: z.array(
        z.object({
          clientId: z.number().describe('Client ID'),
          name: z.string().describe('Client name'),
          isActive: z.boolean().describe('Whether active'),
          address: z.string().nullable().describe('Client address'),
          currency: z.string().describe('Currency code'),
          createdAt: z.string().describe('Created timestamp'),
          updatedAt: z.string().describe('Updated timestamp')
        })
      ),
      totalEntries: z.number().describe('Total clients'),
      totalPages: z.number().describe('Total pages'),
      nextCursor: z.string().nullable().describe('Pass this cursor to retrieve the next page'),
      pageNumberKnown: z
        .boolean()
        .describe('Whether the API returned a page number; cursor responses may omit it'),
      page: z.number().describe('Page number; 1 when pageNumberKnown is false')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: resolveHarvestAccountId(ctx)
    });

    let result = await client.listClients({
      isActive: ctx.input.isActive,
      cursor: ctx.input.cursor,
      page: ctx.input.cursor ? undefined : ctx.input.page,
      perPage: ctx.input.perPage
    });

    let clients = result.results.map((c: any) => ({
      clientId: c.id,
      name: c.name,
      isActive: c.is_active,
      address: c.address,
      currency: c.currency,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: {
        clients,
        totalEntries: result.totalEntries,
        totalPages: result.totalPages,
        nextCursor: result.nextCursor,
        pageNumberKnown: result.pageNumberKnown,
        page: result.page
      },
      message: `Found **${result.totalEntries}** clients${result.pageNumberKnown ? ` (page ${result.page}/${result.totalPages})` : ' (cursor page)'}.`
    };
  })
  .build();
