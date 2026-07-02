import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let quoteSchema = z.object({
  quoteId: z.number().describe('Unique quote ID'),
  number: z.string().optional().describe('Quote number'),
  subject: z.string().optional().describe('Quote subject'),
  contact: z.string().optional().describe('Contact reference'),
  project: z.string().optional().describe('Project reference'),
  date: z.string().optional().describe('Quote date'),
  expiryDate: z.string().optional().describe('Expiry date'),
  totalExclVat: z.number().optional().describe('Total amount excluding VAT'),
  totalInclVat: z.number().optional().describe('Total amount including VAT'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let listQuotes = SlateTool.create(spec, {
  name: 'List Quotes',
  key: 'list_quotes',
  description: `Retrieve a list of quotes (quotations) from Rentman. Browse all quotes with their amounts, contacts, and expiry dates.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().default(25).describe('Maximum number of results (max 300)'),
      offset: z.number().optional().default(0).describe('Number of results to skip'),
      sort: z.string().optional().describe('Sort field with + or - prefix'),
      fields: z.string().optional().describe('Comma-separated fields to return')
    })
  )
  .output(
    z.object({
      quotes: z.array(quoteSchema),
      itemCount: z.number(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.list('quotes', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      fields: ctx.input.fields
    });

    let quotes = result.data.map((q: any) => ({
      quoteId: q.id,
      number: q.number,
      subject: q.subject,
      contact: q.contact,
      project: q.project,
      date: q.date,
      expiryDate: q.expiry_date,
      totalExclVat: q.total_excl_vat,
      totalInclVat: q.total_incl_vat,
      createdAt: q.created,
      updatedAt: q.modified
    }));

    return {
      output: {
        quotes,
        itemCount: result.itemCount,
        limit: result.limit,
        offset: result.offset
      },
      message: `Found **${result.itemCount}** quotes. Returned ${quotes.length} quotes (offset: ${result.offset}).`
    };
  })
  .build();
