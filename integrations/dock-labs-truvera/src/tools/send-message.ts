import { createApiServiceError, SlateTool } from 'slates';
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
      message: z
        .record(z.string(), z.unknown())
        .describe('Message payload to encrypt and send, or an already encrypted DIDComm JWE'),
      messageType: z
        .string()
        .optional()
        .describe(
          'DIDComm message schema URI. Required when the recipient wallet expects a specific schema'
        )
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

    let message = ctx.input.message;
    let alreadyEncrypted =
      typeof message.ciphertext === 'string' && typeof message.protected === 'string';
    if (!alreadyEncrypted) {
      if (ctx.input.fromDid.startsWith('did:key:')) {
        throw createApiServiceError(
          'Use a sender DID with a DIDComm service, such as did:cheqd. did:key cannot send wallet messages.'
        );
      }
      let encrypted = await client.encryptMessage({
        type: ctx.input.messageType,
        payload: message,
        senderDid: ctx.input.fromDid,
        recipientDids: [ctx.input.toDid]
      });
      if (
        typeof encrypted.jwe !== 'object' ||
        encrypted.jwe === null ||
        Array.isArray(encrypted.jwe)
      ) {
        throw createApiServiceError(
          'Truvera did not return an encrypted message. Check the sender DID and message schema.'
        );
      }
      message = encrypted.jwe as Record<string, unknown>;
    }
    let result = await client.sendMessage({
      to: ctx.input.toDid,
      message
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
