import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppDragClient } from '../lib/client';
import { spec } from '../spec';

export let deleteNewsletterList = SlateTool.create(spec, {
  name: 'Delete Newsletter List',
  key: 'delete_newsletter_list',
  description: 'Delete an AppDrag newsletter mailing list by its name.',
  instructions: [
    'This deletes the list itself. Use manage_newsletter_contacts to remove selected contacts from a list.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      listName: z.string().min(1).describe('The name of the newsletter list to delete.')
    })
  )
  .output(z.object({ result: z.any().describe('The response from the newsletter API.') }))
  .handleInvocation(async ctx => {
    let client = new AppDragClient({ apiKey: ctx.auth.token, appId: ctx.config.appId });
    let result = await client.newsletterDeleteLists(ctx.input.listName);
    return {
      output: { result },
      message: `Deleted newsletter list **${ctx.input.listName}**.`
    };
  })
  .build();
