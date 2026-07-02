import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCallerIds = SlateTool.create(spec, {
  name: 'List Caller IDs',
  key: 'list_caller_ids',
  description: `Retrieve caller IDs from your DialMyCalls account. Caller IDs are used as the outgoing phone number for voice call broadcasts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      callerIdId: z
        .string()
        .optional()
        .describe('Fetch a specific caller ID by ID. If omitted, lists all caller IDs.'),
      range: z.string().optional().describe('Pagination range, e.g. "records=201-300"')
    })
  )
  .output(
    z.object({
      callerIds: z.array(
        z.object({
          callerIdId: z.string().optional(),
          name: z.string().optional(),
          phone: z.string().optional(),
          approved: z.boolean().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.callerIdId) {
      let cid = await client.getCallerId(ctx.input.callerIdId);
      return {
        output: {
          callerIds: [
            {
              callerIdId: cid.id,
              name: cid.name,
              phone: cid.phone,
              approved: cid.approved,
              createdAt: cid.created_at,
              updatedAt: cid.updated_at
            }
          ]
        },
        message: `Retrieved caller ID **${cid.name}** (${cid.phone}).`
      };
    }

    let rawCallerIds = await client.listCallerIds(ctx.input.range);
    let callerIds = rawCallerIds.map(c => ({
      callerIdId: c.id,
      name: c.name,
      phone: c.phone,
      approved: c.approved,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { callerIds },
      message: `Retrieved **${callerIds.length}** caller ID(s).`
    };
  })
  .build();
