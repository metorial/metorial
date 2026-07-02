import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTimezones = SlateTool.create(spec, {
  name: 'List Timezones',
  key: 'list_timezones',
  description: `Lists MailerLite timezone IDs and offsets. Use these timezoneId values when scheduling campaigns or assigning timezone-aware settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      timezones: z
        .array(
          z.object({
            timezoneId: z.string().describe('MailerLite timezone ID'),
            name: z.string().describe('Timezone name'),
            nameForHumans: z.string().optional().describe('Display name with offset'),
            offsetName: z.string().optional().describe('UTC offset label'),
            offset: z.number().optional().describe('Offset in minutes')
          })
        )
        .describe('Available MailerLite timezones')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTimezones();
    let timezones = (result.data || []).map((timezone: any) => ({
      timezoneId: String(timezone.id),
      name: timezone.name,
      nameForHumans: timezone.name_for_humans,
      offsetName: timezone.offset_name,
      offset: timezone.offset
    }));

    return {
      output: { timezones },
      message: `Retrieved **${timezones.length}** MailerLite timezones.`
    };
  })
  .build();
