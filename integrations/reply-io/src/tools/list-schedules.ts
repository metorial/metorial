import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSchedules = SlateTool.create(spec, {
  name: 'List Schedules',
  key: 'list_schedules',
  description: `Retrieve sending schedules that control when sequence steps are executed. Filter by name, default status, or associated sequence.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by schedule name'),
      isDefault: z.boolean().optional().describe('Filter for the default schedule'),
      sequenceId: z
        .string()
        .optional()
        .describe('Filter schedules linked to a specific sequence')
    })
  )
  .output(
    z.object({
      schedules: z.array(z.record(z.string(), z.any())).describe('List of schedules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSchedules({
      name: ctx.input.name,
      isDefault: ctx.input.isDefault,
      sequenceId: ctx.input.sequenceId
    });

    let schedules = result?.data ?? (Array.isArray(result) ? result : []);

    return {
      output: { schedules },
      message: `Found **${schedules.length}** schedule(s).`
    };
  })
  .build();
