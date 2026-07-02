import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let manageDayLock = SlateTool.create(spec, {
  name: 'Manage Day Lock',
  key: 'manage_day_lock',
  description: `Lock or unlock specific dates for specific users in Timely. Locking prevents accidental changes or unauthorized edits to time records for those days.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      action: z.enum(['lock', 'unlock']).describe('Whether to lock or unlock the days'),
      userIds: z.array(z.number()).describe('User IDs to lock/unlock days for'),
      dates: z.array(z.string()).describe('Dates to lock/unlock (YYYY-MM-DD format)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      action: z.string().describe('Action performed'),
      userCount: z.number().describe('Number of users affected'),
      dateCount: z.number().describe('Number of dates affected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'lock') {
      await client.lockDays(ctx.input.userIds, ctx.input.dates);
    } else {
      await client.unlockDays(ctx.input.userIds, ctx.input.dates);
    }

    return {
      output: {
        success: true,
        action: ctx.input.action,
        userCount: ctx.input.userIds.length,
        dateCount: ctx.input.dates.length
      },
      message: `**${ctx.input.action === 'lock' ? 'Locked' : 'Unlocked'}** ${ctx.input.dates.length} date(s) for ${ctx.input.userIds.length} user(s).`
    };
  })
  .build();
