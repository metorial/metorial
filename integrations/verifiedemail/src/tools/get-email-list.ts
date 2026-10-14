import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { emailListSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getEmailList = SlateTool.create(spec, {
  name: 'Get Email List',
  key: 'get_email_list',
  description:
    'Read an email list and its verification statistics. Use this to poll an asynchronous verification job until its status is verified, partial, or failed.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      listId: z
        .string()
        .min(1)
        .describe('List ID returned by create_email_list or list_email_lists')
    })
  )
  .output(emailListSchema)
  .handleInvocation(async ctx => {
    let list = await new Client({ token: ctx.auth.token }).getList(ctx.input.listId);
    return {
      output: list,
      message: `Email list **${list.name}** (${list.listId}) is **${list.status}**.`
    };
  })
  .build();
