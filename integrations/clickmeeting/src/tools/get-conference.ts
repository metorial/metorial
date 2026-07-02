import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConference = SlateTool.create(spec, {
  name: 'Get Conference',
  key: 'get_conference',
  description: `Retrieves detailed information about a specific conference room, including its configuration, access settings, schedule, URLs, and role-based access hashes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room')
    })
  )
  .output(
    z.object({
      conference: z.record(z.string(), z.unknown()).describe('Conference room details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let conference = await client.getConference(ctx.input.roomId);

    return {
      output: { conference },
      message: `Retrieved conference **${conference?.name || ctx.input.roomId}**.`
    };
  })
  .build();
