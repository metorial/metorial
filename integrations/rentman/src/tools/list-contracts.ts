import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contractSchema = z.object({
  contractId: z.number().describe('Unique contract ID'),
  number: z.string().optional().describe('Contract number'),
  subject: z.string().optional().describe('Contract subject'),
  contact: z.string().optional().describe('Contact reference'),
  project: z.string().optional().describe('Project reference'),
  date: z.string().optional().describe('Contract date'),
  totalExclVat: z.number().optional().describe('Total amount excluding VAT'),
  totalInclVat: z.number().optional().describe('Total amount including VAT'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let listContracts = SlateTool.create(spec, {
  name: 'List Contracts',
  key: 'list_contracts',
  description: `Retrieve a list of contracts from Rentman. Browse rental contracts with their amounts, contacts, and dates.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of results (max 1500)'),
      offset: z.number().optional().default(0).describe('Number of results to skip'),
      sort: z.string().optional().describe('Sort field with + or - prefix'),
      fields: z.string().optional().describe('Comma-separated fields to return'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque cursor token from a previous nextPageUrl. Pass it unchanged and repeat the original filters, resource IDs, sort, and fields.'
        )
    })
  )
  .output(
    z.object({
      contracts: z.array(contractSchema),
      itemCount: z.number(),
      limit: z.number(),
      offset: z.number(),
      nextPageUrl: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.list('contracts', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      fields: ctx.input.fields,
      cursor: ctx.input.cursor
    });

    let contracts = result.data.map((c: any) => ({
      contractId: c.id,
      number: c.number,
      subject: c.subject,
      contact: c.contact ?? undefined,
      project: c.project,
      date: c.date ?? undefined,
      totalExclVat: c.price ?? c.total_excl_vat,
      totalInclVat: c.price_invat ?? c.total_incl_vat,
      createdAt: c.created ?? undefined,
      updatedAt: c.modified ?? undefined
    }));

    return {
      output: {
        contracts,
        itemCount: result.itemCount,
        limit: result.limit,
        offset: result.offset,
        nextPageUrl: result.next_page_url
      },
      message: `Found **${result.itemCount}** contracts. Returned ${contracts.length} contracts (offset: ${result.offset}).`
    };
  })
  .build();
