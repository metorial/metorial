import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLink = SlateTool.create(spec, {
  name: 'Delete Link',
  key: 'delete_link',
  description: `Delete a previously created short link. Provide the shortened link identifier (e.g., "u301.co/fuYx") to permanently remove it.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      shortenedLink: z.string().describe('The shortened link to delete (e.g., "u301.co/fuYx")')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the link was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Deleting link...');

    let result = await client.deleteLink(ctx.input.shortenedLink);

    return {
      output: {
        success: result.success
      },
      message: `Link **${ctx.input.shortenedLink}** has been deleted.`
    };
  })
  .build();
