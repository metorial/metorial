import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let signingIdentityEvents = SlateTrigger.create(spec, {
  name: 'Signing Identity Events',
  key: 'signing_identity_events',
  description:
    'Triggers on signing identity events including certificate, provisioning profile, and keystore operations such as added, deleted, or approaching expiration.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of signing identity event'),
      eventId: z.string().describe('Unique identifier for this event'),
      identityType: z
        .string()
        .optional()
        .describe(
          'Type of identity (certificate, keystore, provisioning_profile, device, identifier)'
        ),
      identityId: z.string().optional().describe('ID of the signing identity'),
      identityName: z.string().optional().describe('Name of the signing identity'),
      raw: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z
      .object({
        identityType: z.string().optional().describe('Type of identity'),
        identityId: z.string().optional().describe('ID of the signing identity'),
        identityName: z.string().optional().describe('Name of the signing identity')
      })
      .passthrough()
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body?.action ?? body?.event ?? body?.eventType ?? 'unknown';
      let eventId = body?.id ?? body?.eventId ?? `signing-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: String(eventType),
            eventId: String(eventId),
            identityType: body?.identityType ?? body?.type,
            identityId: body?.identityId ?? body?.entityId,
            identityName: body?.identityName ?? body?.name,
            raw: body
          }
        ]
      };
    },
    handleEvent: async ctx => {
      return {
        type: `signing_identity.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          identityType: ctx.input.identityType,
          identityId: ctx.input.identityId,
          identityName: ctx.input.identityName,
          ...ctx.input.raw
        }
      };
    }
  })
  .build();
