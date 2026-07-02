import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCredentialInteraction = SlateTool.create(spec, {
  name: 'Create Credential Interaction',
  key: 'create_credential_interaction',
  description: `Record an interaction event for a credential. Tracks engagement such as views, downloads, shares to social platforms, and verification events.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      credentialId: z.string().describe('ID of the credential the interaction belongs to'),
      eventType: z
        .enum([
          'credential_viewed',
          'credential_shared_to_linkedin',
          'credential_added_to_linkedin_profile',
          'credential_shared_to_facebook',
          'credential_shared_to_twitter',
          'credential_shared_to_messenger',
          'credential_shared_to_whatsapp',
          'credential_shared_to_pinterest',
          'credential_shared_to_telegram',
          'credential_shared_to_weibo',
          'credential_downloaded',
          'credential_link_copied',
          'credential_verified'
        ])
        .describe('Type of interaction event'),
      triggeredBy: z.enum(['recipient', 'guest']).describe('Who triggered the interaction'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of when the interaction occurred')
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('ID of the credential'),
      eventType: z.string().describe('Type of interaction recorded'),
      recorded: z.boolean().describe('Whether the interaction was successfully recorded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.createInteraction({
      credentialId: ctx.input.credentialId,
      eventType: ctx.input.eventType,
      triggeredBy: ctx.input.triggeredBy,
      triggeredAt: ctx.input.triggeredAt
    });

    return {
      output: {
        credentialId: ctx.input.credentialId,
        eventType: ctx.input.eventType,
        recorded: true
      },
      message: `Interaction **${ctx.input.eventType}** recorded for credential \`${ctx.input.credentialId}\` (triggered by ${ctx.input.triggeredBy}).`
    };
  })
  .build();
