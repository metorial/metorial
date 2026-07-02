import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCheckin = SlateTool.create(spec, {
  name: 'Delete Check-in',
  key: 'delete_checkin',
  description: `Permanently delete a check-in. This action cannot be undone and will remove all associated configuration and scheduled triggers.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      checkinUuid: z.string().describe('UUID of the check-in to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the check-in was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    await client.deleteCheckin(ctx.input.checkinUuid);

    return {
      output: { deleted: true },
      message: `Deleted check-in \`${ctx.input.checkinUuid}\`.`
    };
  })
  .build();
