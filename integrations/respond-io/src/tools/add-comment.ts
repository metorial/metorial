import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addComment = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add an internal comment (note) to a contact's conversation. Comments are visible to workspace members and can mention users with the \`{{@user.ID}}\` syntax.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to add a comment on'),
      text: z.string().describe('Comment text. Use {{@user.ID}} to mention workspace users.')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      commentText: z.string().describe('The comment text that was added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.addComment(ctx.input.contactId, ctx.input.text);

    return {
      output: {
        contactId: ctx.input.contactId,
        commentText: ctx.input.text
      },
      message: `Added comment on contact **${ctx.input.contactId}**.`
    };
  })
  .build();
