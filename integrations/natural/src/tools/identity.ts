import { SlateTool } from 'slates';
import { z } from 'zod';
import { naturalServiceError } from '../lib/errors';
import { spec } from '../spec';
import { rawRecordSchema } from './schemas';
import { createClient } from './shared';

const identityActorSchema = z
  .object({
    actorType: z.string(),
    credentialKind: z.string().nullable(),
    agentIdSource: z.string().nullable()
  })
  .passthrough();

const identityPartySchema = z
  .object({
    partyId: z.string().regex(/^pty_[0-9a-f]{32}$/),
    displayName: z.string().nullable(),
    handle: z.string().nullable()
  })
  .passthrough();

const identityActingForSchema = z
  .object({
    partyId: z.string().regex(/^pty_[0-9a-f]{32}$/)
  })
  .passthrough();

const identityAgentSchema = z
  .object({
    agentId: z.string().regex(/^agt_[0-9a-f]{32}$/),
    name: z.string(),
    handle: z.string().nullable()
  })
  .passthrough();

const identityAttributesSchema = z
  .object({
    actor: identityActorSchema,
    party: identityPartySchema,
    actingFor: identityActingForSchema,
    agent: identityAgentSchema.nullable(),
    permissions: z.array(z.string())
  })
  .passthrough();

const whoAmISuccessSchema = z
  .object({
    data: z
      .object({
        id: z.string().min(1),
        type: z.literal('identity'),
        attributes: identityAttributesSchema
      })
      .passthrough(),
    meta: rawRecordSchema.optional()
  })
  .passthrough();

export const whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description:
    'Get the Natural party, effective acting party, acting agent, credential resolution details, and permissions associated with the authenticated connection.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      identityId: z.string(),
      type: z.literal('identity'),
      actorType: z.string(),
      credentialKind: z.string().nullable(),
      agentIdSource: z.string().nullable(),
      partyId: z.string(),
      partyDisplayName: z.string().nullable(),
      partyHandle: z.string().nullable(),
      actingForPartyId: z.string(),
      agentId: z.string().nullable(),
      agentName: z.string().nullable(),
      agentHandle: z.string().nullable(),
      permissions: z.array(z.string()),
      attributes: rawRecordSchema,
      identity: rawRecordSchema,
      meta: rawRecordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('get identity', 'get', '/identity/me');
    const response = whoAmISuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when retrieving the authenticated identity. This is a read-only request, so it is safe to retry.',
        'natural_response_error'
      );
    }

    const { data: identity, meta } = response.data;
    const { actor, party, actingFor, agent, permissions } = identity.attributes;

    return {
      output: {
        identityId: identity.id,
        type: identity.type,
        actorType: actor.actorType,
        credentialKind: actor.credentialKind,
        agentIdSource: actor.agentIdSource,
        partyId: party.partyId,
        partyDisplayName: party.displayName,
        partyHandle: party.handle,
        actingForPartyId: actingFor.partyId,
        agentId: agent?.agentId ?? null,
        agentName: agent?.name ?? null,
        agentHandle: agent?.handle ?? null,
        permissions,
        attributes: identity.attributes,
        identity,
        ...(meta === undefined ? {} : { meta })
      },
      message: `Authenticated Natural identity resolves as **${actor.actorType}** for party **${actingFor.partyId}**.`
    };
  })
  .build();
