import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIncomingTexts = SlateTool.create(spec, {
  name: 'List Incoming Texts',
  key: 'list_incoming_texts',
  description: `Retrieve inbound text messages received on your vanity numbers or keywords. Each message includes sender number, recipient number, and message content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      incomingTextId: z
        .string()
        .optional()
        .describe(
          'Fetch a specific incoming text by ID. If omitted, lists all incoming texts.'
        ),
      range: z.string().optional().describe('Pagination range, e.g. "records=201-300"')
    })
  )
  .output(
    z.object({
      incomingTexts: z.array(
        z.object({
          incomingTextId: z.string().optional(),
          fromNumber: z.string().optional(),
          toNumber: z.string().optional(),
          message: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.incomingTextId) {
      let text = await client.getIncomingText(ctx.input.incomingTextId);
      return {
        output: {
          incomingTexts: [
            {
              incomingTextId: text.id,
              fromNumber: text.from_number,
              toNumber: text.to_number,
              message: text.message,
              createdAt: text.created_at,
              updatedAt: text.updated_at
            }
          ]
        },
        message: `Retrieved incoming text from **${text.from_number}**.`
      };
    }

    let rawTexts = await client.listIncomingTexts(ctx.input.range);
    let incomingTexts = rawTexts.map(t => ({
      incomingTextId: t.id,
      fromNumber: t.from_number,
      toNumber: t.to_number,
      message: t.message,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: { incomingTexts },
      message: `Retrieved **${incomingTexts.length}** incoming text(s).`
    };
  })
  .build();
