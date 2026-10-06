import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlexClient } from '../lib/client';
import { validateInput } from '../lib/validation';
import { spec } from '../spec';
export let getInteractionTool = SlateTool.create(spec, {
  key: 'get_interaction',
  name: 'Get Interaction',
  description:
    'Read one exact Flex interaction and its native channel/routing details after asynchronous acceptance. Use manage_interaction_channel to inspect setup or failure status; acceptance alone does not establish successful delivery or routing.',
  tags: { readOnly: true }
})
  .input(
    z.object({ interactionSid: z.string().describe('KD SID returned by create_interaction.') })
  )
  .output(
    z.object({
      interactionSid: z.string(),
      channel: z.record(z.string(), z.unknown()).optional(),
      routing: z.record(z.string(), z.unknown()).optional(),
      interactionContextSid: z.string().optional(),
      url: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateInput('get_interaction', ctx.input);
    const result = await new FlexClient(ctx.auth.token, ctx.auth.accountSid).getInteraction(
      ctx.input.interactionSid
    );
    return {
      output: {
        interactionSid: result.sid,
        channel: result.channel,
        routing: result.routing,
        interactionContextSid: result.interaction_context_sid,
        url: result.url
      },
      message: `Retrieved interaction ${result.sid}. Check the associated channel status before treating setup as complete.`
    };
  })
  .build();
