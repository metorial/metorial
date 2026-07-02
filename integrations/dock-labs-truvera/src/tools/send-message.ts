import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send an encrypted DIDComm message between DIDs. Enables direct credential delivery to wallet holders or secure communication between organizations and credential holders.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      toDid: z.string().describe('Recipient DID'),
      fromDid: z.string().describe('Sender DID'),
      message: z.record(z.string(), z.unknown()).describe('Message payload to send')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the message was sent successfully'),
      result: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Response from the messaging API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.sendMessage({
      to: ctx.input.toDid,
      from: ctx.input.fromDid,
      message: ctx.input.message
    });

    return {
      output: {
        sent: true,
        result
      },
      message: `Sent message from **${ctx.input.fromDid}** to **${ctx.input.toDid}**`
    };
  })
  .build();
