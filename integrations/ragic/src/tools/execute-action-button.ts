import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let executeActionButton = SlateTool.create(spec, {
  name: 'Execute Action Button',
  key: 'execute_action_button',
  description: `Trigger a pre-configured action button on a specific record in a Ragic sheet. Action buttons can perform automated tasks like sending emails, updating related records, or executing custom logic.

Use the **List Action Buttons** tool first to discover available button IDs for a sheet.`,
  instructions: [
    'You need the **buttonId** which can be obtained from the List Action Buttons tool.',
    'You must have both permission to execute the button and permission to view the target record.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      tabFolder: z.string().describe('The tab/folder path in the Ragic URL'),
      sheetIndex: z.number().describe('The numeric sheet index from the Ragic URL'),
      recordId: z.number().describe('The ID of the record to execute the action button on'),
      buttonId: z.string().describe('The ID of the action button to execute')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('The ID of the record the action was executed on'),
      response: z.record(z.string(), z.any()).describe('Response from the Ragic API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverDomain: ctx.config.serverDomain,
      accountName: ctx.config.accountName
    });

    let sheet = {
      tabFolder: ctx.input.tabFolder,
      sheetIndex: ctx.input.sheetIndex
    };

    let result = await client.executeActionButton(
      sheet,
      ctx.input.recordId,
      ctx.input.buttonId
    );

    return {
      output: {
        recordId: String(ctx.input.recordId),
        response: result
      },
      message: `Executed action button **${ctx.input.buttonId}** on record **${ctx.input.recordId}** in sheet **${ctx.input.tabFolder}/${ctx.input.sheetIndex}**.`
    };
  })
  .build();
