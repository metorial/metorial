import { SlateTool } from 'slates';
import { z } from 'zod';
import { CuttlyClient, getEditStatusMessage } from '../lib/client';
import { spec } from '../spec';

export let deleteLink = SlateTool.create(spec, {
  name: 'Delete Link',
  key: 'delete_link',
  description: `Permanently delete a Cutt.ly shortened link. Once deleted, the short link will no longer redirect to the destination URL and the alias becomes available for reuse.`,
  instructions: [
    'This action is irreversible — the link and all associated analytics data will be permanently removed.'
  ],
  constraints: ['You can only delete links that you own.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      shortLink: z.string().describe('The shortened URL to delete')
    })
  )
  .output(
    z.object({
      shortLink: z.string().describe('The shortened URL that was deleted'),
      statusMessage: z.string().describe('Human-readable result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CuttlyClient({
      apiKey: ctx.auth.token,
      apiType: ctx.config.apiType
    });

    let result = await client.deleteLink(ctx.input.shortLink);

    if (result.status !== 1) {
      throw new Error(`Failed to delete link: ${getEditStatusMessage(result.status)}`);
    }

    return {
      output: {
        shortLink: ctx.input.shortLink,
        statusMessage: 'Link deleted successfully'
      },
      message: `Deleted **${ctx.input.shortLink}**`
    };
  })
  .build();
