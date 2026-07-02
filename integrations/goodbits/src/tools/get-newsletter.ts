import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNewsletter = SlateTool.create(spec, {
  name: 'Get Newsletter',
  key: 'get_newsletter',
  description: `Retrieve information about the newsletter associated with the current API token. Returns the newsletter's ID and name. Useful for verifying authentication and confirming which newsletter is being accessed.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      newsletterId: z.number().describe('Unique identifier of the newsletter'),
      name: z.string().describe('Name of the newsletter')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let newsletter = await client.getNewsletter();

    return {
      output: newsletter,
      message: `Retrieved newsletter **${newsletter.name}** (ID: ${newsletter.newsletterId}).`
    };
  })
  .build();
