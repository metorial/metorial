import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invoiceInputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let bulkUpsertInvoices = SlateTool.create(spec, {
  name: 'Bulk Upsert Invoices',
  key: 'bulk_upsert_invoices',
  description: `Create or update up to 100 invoices in a single request. Matching is done by invoice ID; existing invoices are updated and new ones are created. Associated customers must already exist.`,
  constraints: ['Maximum 100 invoices per request.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoices: z
        .array(invoiceInputSchema)
        .min(1)
        .max(100)
        .describe('Array of invoice records to upsert (max 100)')
    })
  )
  .output(
    z.object({
      modifiedCount: z.number().describe('Number of invoices updated'),
      insertedCount: z.number().describe('Number of invoices created'),
      insertedIds: z
        .array(
          z.object({
            index: z.number().describe('Index in the input array'),
            insertedId: z.string().describe('Internal Chaser ID of the inserted invoice')
          })
        )
        .describe('IDs of newly created invoices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.bulkUpsertInvoices(ctx.input.invoices);

    return {
      output: {
        modifiedCount: result.modifiedCount,
        insertedCount: result.insertedCount,
        insertedIds: (result.insertedIds || []).map((item: any) => ({
          index: item.index,
          insertedId: item.id
        }))
      },
      message: `Bulk upsert complete: **${result.insertedCount}** invoices created, **${result.modifiedCount}** updated.`
    };
  })
  .build();
