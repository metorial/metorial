import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listParsers = SlateTool.create(spec, {
  name: 'List Parsers',
  key: 'list_parsers',
  description: `List all Document Parsers configured in your Docparser account. Returns each parser's ID and label. Parser IDs are required for importing documents, retrieving parsed data, and most other operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      parsers: z
        .array(
          z.object({
            parserId: z.string().describe('Unique identifier of the parser'),
            label: z.string().describe('Human-readable label of the parser')
          })
        )
        .describe('List of document parsers in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let parsers = await client.listParsers();

    return {
      output: { parsers },
      message: `Found **${parsers.length}** document parser(s).`
    };
  })
  .build();
