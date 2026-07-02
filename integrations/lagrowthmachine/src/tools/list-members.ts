import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `List all members (users) associated with your La Growth Machine workspace. Returns member details including ID, name, and label.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      members: z.array(z.any()).describe('List of workspace member records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMembers();

    let members = Array.isArray(result) ? result : (result?.members ?? [result]);

    return {
      output: { members },
      message: `Retrieved **${members.length}** workspace member(s).`
    };
  })
  .build();
