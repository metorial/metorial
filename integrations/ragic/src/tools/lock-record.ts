import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lockRecord = SlateTool.create(spec, {
  name: 'Lock / Unlock Record',
  key: 'lock_record',
  description: `Lock or unlock a record in a Ragic sheet. Locked records cannot be modified by other users through the UI or API (unless checkLock is not used). Use this to prevent concurrent modifications.`,
  instructions: [
    'Set **lock** to `true` to lock and `false` to unlock.',
    'Locked records can still be modified by Action Buttons or formula recalculations.'
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
      recordId: z.number().describe('The ID of the record to lock or unlock'),
      lock: z.boolean().describe('Set to true to lock the record, false to unlock it')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('The ID of the affected record'),
      locked: z.boolean().describe('Whether the record is now locked'),
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

    let result: Record<string, any>;
    if (ctx.input.lock) {
      result = await client.lockRecord(sheet, ctx.input.recordId);
    } else {
      result = await client.unlockRecord(sheet, ctx.input.recordId);
    }

    let action = ctx.input.lock ? 'Locked' : 'Unlocked';

    return {
      output: {
        recordId: String(ctx.input.recordId),
        locked: ctx.input.lock,
        response: result
      },
      message: `${action} record **${ctx.input.recordId}** in sheet **${ctx.input.tabFolder}/${ctx.input.sheetIndex}**.`
    };
  })
  .build();
