import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listActionButtons = SlateTool.create(spec, {
  name: 'List Action Buttons',
  key: 'list_action_buttons',
  description: `Retrieve all available action buttons configured on a Ragic sheet. Returns button metadata including IDs needed to execute buttons via the Execute Action Button tool.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tabFolder: z.string().describe('The tab/folder path in the Ragic URL'),
      sheetIndex: z.number().describe('The numeric sheet index from the Ragic URL'),
      category: z
        .enum(['default', 'massOperation'])
        .optional()
        .describe(
          'Filter buttons by category. Use "massOperation" to only get mass operation buttons.'
        )
    })
  )
  .output(
    z.object({
      buttons: z
        .record(z.string(), z.any())
        .describe('Action button metadata keyed by button ID')
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

    let category = ctx.input.category === 'default' ? undefined : ctx.input.category;
    let result = await client.getActionButtons(sheet, category);

    return {
      output: {
        buttons: result
      },
      message: `Retrieved action buttons for sheet **${ctx.input.tabFolder}/${ctx.input.sheetIndex}**.`
    };
  })
  .build();
