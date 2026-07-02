import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContactGroup = SlateTool.create(spec, {
  name: 'Get Contact Group',
  key: 'get_contact_group',
  description: `Retrieve detailed information about a specific contact group. Returns group name, email addresses, mobile numbers, integration IDs, and ping URL.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the contact group to retrieve')
    })
  )
  .output(
    z.object({
      group: z.record(z.string(), z.any()).describe('Contact group details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getContactGroup(ctx.input.groupId);
    let group = result?.data ?? result;

    return {
      output: { group },
      message: `Retrieved contact group **${group.name ?? ctx.input.groupId}**.`
    };
  })
  .build();
