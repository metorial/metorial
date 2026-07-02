import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendBroadcast = SlateTool.create(spec, {
  name: 'Send Broadcast',
  key: 'send_broadcast',
  description: `Send a message broadcast to multiple contacts, groups, or URNs at once. Supports translated messages with a base language. At least one recipient (URN, contact, or group) must be specified.`,
  instructions: [
    'The text field is a map of language codes to message text, e.g., {"eng": "Hello", "fra": "Bonjour"}.',
    'Set baseLanguage to indicate the default translation language.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      text: z
        .record(z.string(), z.string())
        .describe(
          'Message text translations keyed by ISO-639-3 language code (e.g., {"eng": "Hello"})'
        ),
      urns: z.array(z.string()).optional().describe('Recipient URNs (max 100)'),
      contactUuids: z
        .array(z.string())
        .optional()
        .describe('Recipient contact UUIDs (max 100)'),
      groupUuids: z.array(z.string()).optional().describe('Recipient group UUIDs'),
      baseLanguage: z
        .string()
        .optional()
        .describe('Default translation language code (ISO-639-3)')
    })
  )
  .output(
    z.object({
      broadcastUuid: z.string().describe('UUID of the created broadcast'),
      status: z.string().describe('Status of the broadcast'),
      createdOn: z.string().describe('When the broadcast was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let broadcast = await client.sendBroadcast({
      text: ctx.input.text,
      urns: ctx.input.urns,
      contacts: ctx.input.contactUuids,
      groups: ctx.input.groupUuids,
      base_language: ctx.input.baseLanguage
    });

    return {
      output: {
        broadcastUuid: broadcast.uuid,
        status: broadcast.status,
        createdOn: broadcast.created_on
      },
      message: `Broadcast **${broadcast.uuid}** created (status: ${broadcast.status}).`
    };
  })
  .build();
