import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSchedulesTool = SlateTool.create(spec, {
  name: 'List Schedules',
  key: 'list_schedules',
  description: `Retrieve all schedules configured in the SuperSaaS account along with their IDs. Use this to discover available schedules before querying appointments, availability, or resources.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      schedules: z
        .array(
          z.object({
            scheduleId: z.string().describe('Internal SuperSaaS schedule ID'),
            scheduleName: z.string().describe('Display name of the schedule')
          })
        )
        .describe('List of schedules in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.listSchedules();

    let schedules = Array.isArray(data)
      ? data.map((item: any) => ({
          scheduleId: String(item.id ?? item[0] ?? ''),
          scheduleName: String(item.name ?? item[1] ?? '')
        }))
      : [];

    return {
      output: { schedules },
      message: `Found **${schedules.length}** schedule(s).`
    };
  })
  .build();
