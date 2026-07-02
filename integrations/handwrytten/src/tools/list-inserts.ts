import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let insertSchema = z.object({
  insertId: z.string().describe('Unique ID of the insert'),
  name: z.string().describe('Name of the insert'),
  price: z.string().optional().describe('Price of the insert')
});

export let listInserts = SlateTool.create(spec, {
  name: 'List Inserts',
  key: 'list_inserts',
  description: `Retrieve available physical inserts (e.g., business cards, magnets) that can be included with card orders. Use the insert ID when sending a card to include a physical insert.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      inserts: z.array(insertSchema).describe('Available physical inserts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listInserts();
    let rawInserts = result.inserts ?? [];

    let inserts = rawInserts.map((i: any) => ({
      insertId: String(i.id),
      name: i.name ?? '',
      price: i.price != null ? String(i.price) : undefined
    }));

    return {
      output: { inserts },
      message: `Found **${inserts.length}** available inserts.`
    };
  })
  .build();
