import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let tagResponse = SlateTool.create(spec, {
  name: 'Tag Response',
  key: 'tag_response',
  description: `Add tags to a survey response for categorization and analysis. Tags help organize responses and can trigger webhook events when added.`,
  constraints: ['Maximum of 20 tags per response.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      responseUuid: z.string().describe('UUID of the survey response to tag'),
      responseTags: z.array(z.string()).describe('Tags to add to the response (max 20)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the tags were added successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });

    await client.tagResponse({
      responseUuid: ctx.input.responseUuid,
      tags: ctx.input.responseTags
    });

    return {
      output: { success: true },
      message: `Added **${ctx.input.responseTags.length}** tag(s) to response **${ctx.input.responseUuid}**: ${ctx.input.responseTags.map(t => `"${t}"`).join(', ')}.`
    };
  })
  .build();
