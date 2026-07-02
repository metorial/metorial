import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { customerInputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let bulkUpsertCustomers = SlateTool.create(spec, {
  name: 'Bulk Upsert Customers',
  key: 'bulk_upsert_customers',
  description: `Create or update up to 100 customers in a single request. Matching is done by external ID; existing customers are updated and new ones are created.`,
  constraints: ['Maximum 100 customers per request.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customers: z
        .array(customerInputSchema)
        .min(1)
        .max(100)
        .describe('Array of customer records to upsert (max 100)')
    })
  )
  .output(
    z.object({
      modifiedCount: z.number().describe('Number of customers updated'),
      insertedCount: z.number().describe('Number of customers created'),
      insertedIds: z
        .array(
          z.object({
            index: z.number().describe('Index in the input array'),
            insertedId: z.string().describe('Internal Chaser ID of the inserted customer')
          })
        )
        .describe('IDs of newly created customers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.bulkUpsertCustomers(ctx.input.customers);

    return {
      output: {
        modifiedCount: result.modifiedCount,
        insertedCount: result.insertedCount,
        insertedIds: (result.insertedIds || []).map((item: any) => ({
          index: item.index,
          insertedId: item.id
        }))
      },
      message: `Bulk upsert complete: **${result.insertedCount}** created, **${result.modifiedCount}** updated.`
    };
  })
  .build();
