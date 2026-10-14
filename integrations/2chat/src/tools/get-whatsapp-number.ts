import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let getWhatsAppNumber = SlateTool.create(spec, {
  name: 'Get WhatsApp Number',
  key: 'get_whatsapp_number',
  description:
    'Get the connection status, identity and settings of a connected WhatsApp number. Call List WhatsApp Numbers to find its UUID.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      channelUuid: z
        .string()
        .min(1)
        .describe('Connected number UUID from List WhatsApp Numbers')
    })
  )
  .output(
    z.object({
      channel: z
        .record(z.string(), z.unknown())
        .describe(
          'Connected number details, including uuid, phone_number and connection_status'
        )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new TwoChatClient({ token: ctx.auth.token }).getWhatsAppNumber(
      ctx.input.channelUuid
    );
    return {
      output: { channel: result.channel },
      message: `Retrieved connected number **${ctx.input.channelUuid}**.`
    };
  })
  .build();
