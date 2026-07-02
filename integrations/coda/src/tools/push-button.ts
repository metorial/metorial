import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pushButtonTool = SlateTool.create(spec, {
  name: 'Push Button',
  key: 'push_button',
  description: `Programmatically trigger a button column on a specific row in a Coda table. The button executes whatever action is configured in the doc (e.g., writing to other tables, running Pack actions).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      tableIdOrName: z.string().describe('ID or name of the table'),
      rowIdOrName: z.string().describe('ID or name of the row'),
      columnIdOrName: z.string().describe('ID or name of the button column')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID to track the asynchronous action status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.pushButton(
      ctx.input.docId,
      ctx.input.tableIdOrName,
      ctx.input.rowIdOrName,
      ctx.input.columnIdOrName
    );

    return {
      output: {
        requestId: result.requestId
      },
      message: `Pushed button **${ctx.input.columnIdOrName}** on row **${ctx.input.rowIdOrName}** in table **${ctx.input.tableIdOrName}**.`
    };
  })
  .build();
