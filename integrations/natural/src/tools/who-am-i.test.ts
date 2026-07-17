import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { provider } from '../index';
import { NaturalClient } from '../lib/client';
import { whoAmI } from './identity';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('who_am_i', () => {
  it('registers a bodyless read-only tool with an MCP-compatible object input schema', () => {
    const jsonSchema = z.toJSONSchema(whoAmI.inputSchema) as Record<string, unknown>;

    expect(whoAmI.key).toBe('who_am_i');
    expect(whoAmI.tags).toMatchObject({ readOnly: true });
    expect(whoAmI.inputSchema.parse({})).toEqual({});
    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema).not.toHaveProperty('oneOf');
    expect(jsonSchema).not.toHaveProperty('anyOf');
    expect(jsonSchema).not.toHaveProperty('allOf');
    expect(provider.actions.map(action => action.key)).toContain('who_am_i');
  });

  it('requests the official identity endpoint and exposes complete agent context plus raw additive data', async () => {
    const identity = {
      id: 'agt_019cd1798d657de5b5fed4198cb9fac0',
      type: 'identity',
      attributes: {
        actor: {
          actorType: 'AGENT',
          credentialKind: 'agent_key',
          agentIdSource: 'credential',
          futureActorField: 'preserved'
        },
        party: {
          partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
          displayName: 'Natural',
          handle: '@natural',
          futurePartyField: 'preserved'
        },
        actingFor: {
          partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
          futureActingForField: 'preserved'
        },
        agent: {
          agentId: 'agt_019cd1798d657de5b5fed4198cb9fac0',
          name: 'Procurement Agent',
          handle: '@natural-procurement',
          futureAgentField: 'preserved'
        },
        permissions: ['payments.create', 'payments.read', 'wallets.read'],
        futureAttributesField: { preserved: true }
      },
      futureResourceField: { preserved: true }
    };
    const meta = {
      requestId: 'req_a1b2c3d4e5f6',
      futureMetaField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: identity,
      meta,
      futureEnvelopeField: { preserved: true }
    });

    const result = await whoAmI.handleInvocation({
      input: {},
      auth: { token: 'ak_ntl_test', keyType: 'agent_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith('get identity', 'get', '/identity/me');
    expect(whoAmI.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      identityId: identity.id,
      type: 'identity',
      actorType: identity.attributes.actor.actorType,
      credentialKind: identity.attributes.actor.credentialKind,
      agentIdSource: identity.attributes.actor.agentIdSource,
      partyId: identity.attributes.party.partyId,
      partyDisplayName: identity.attributes.party.displayName,
      partyHandle: identity.attributes.party.handle,
      actingForPartyId: identity.attributes.actingFor.partyId,
      agentId: identity.attributes.agent.agentId,
      agentName: identity.attributes.agent.name,
      agentHandle: identity.attributes.agent.handle,
      permissions: identity.attributes.permissions,
      attributes: identity.attributes,
      identity,
      meta
    });
  });

  it('preserves null credential and agent fields when the credential resolves without an agent', async () => {
    const identity = {
      id: 'usr_019cd1798d657de5b5fed4198cb9fac0',
      type: 'identity',
      attributes: {
        actor: {
          actorType: 'USER',
          credentialKind: null,
          agentIdSource: null
        },
        party: {
          partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
          displayName: null,
          handle: null
        },
        actingFor: {
          partyId: 'pty_019cd1798d617f65a79cb965dda9eac3'
        },
        agent: null,
        permissions: ['payments.read']
      }
    };
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({ data: identity });

    const result = await whoAmI.handleInvocation({
      input: {},
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(result.output).toMatchObject({
      identityId: identity.id,
      actorType: 'USER',
      credentialKind: null,
      agentIdSource: null,
      partyDisplayName: null,
      partyHandle: null,
      agentId: null,
      agentName: null,
      agentHandle: null,
      identity
    });
    expect(result.output).not.toHaveProperty('meta');
  });

  it.each([
    ['missing data', {}],
    [
      'missing identity id',
      {
        data: {
          type: 'identity',
          attributes: {
            actor: { actorType: 'USER', credentialKind: null, agentIdSource: null },
            party: {
              partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
              displayName: null,
              handle: null
            },
            actingFor: { partyId: 'pty_019cd1798d617f65a79cb965dda9eac3' },
            agent: null,
            permissions: []
          }
        }
      }
    ],
    [
      'wrong resource type',
      {
        data: {
          id: 'usr_019cd1798d657de5b5fed4198cb9fac0',
          type: 'party',
          attributes: {
            actor: { actorType: 'USER', credentialKind: null, agentIdSource: null },
            party: {
              partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
              displayName: null,
              handle: null
            },
            actingFor: { partyId: 'pty_019cd1798d617f65a79cb965dda9eac3' },
            agent: null,
            permissions: []
          }
        }
      }
    ],
    [
      'missing actor field',
      {
        data: {
          id: 'usr_019cd1798d657de5b5fed4198cb9fac0',
          type: 'identity',
          attributes: {
            party: {
              partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
              displayName: null,
              handle: null
            },
            actingFor: { partyId: 'pty_019cd1798d617f65a79cb965dda9eac3' },
            agent: null,
            permissions: []
          }
        }
      }
    ],
    [
      'malformed party id',
      {
        data: {
          id: 'usr_019cd1798d657de5b5fed4198cb9fac0',
          type: 'identity',
          attributes: {
            actor: { actorType: 'USER', credentialKind: null, agentIdSource: null },
            party: { partyId: 'party-1', displayName: null, handle: null },
            actingFor: { partyId: 'pty_019cd1798d617f65a79cb965dda9eac3' },
            agent: null,
            permissions: []
          }
        }
      }
    ],
    [
      'missing acting agent field',
      {
        data: {
          id: 'usr_019cd1798d657de5b5fed4198cb9fac0',
          type: 'identity',
          attributes: {
            actor: { actorType: 'USER', credentialKind: null, agentIdSource: null },
            party: {
              partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
              displayName: null,
              handle: null
            },
            actingFor: { partyId: 'pty_019cd1798d617f65a79cb965dda9eac3' },
            permissions: []
          }
        }
      }
    ],
    [
      'incomplete acting agent',
      {
        data: {
          id: 'agt_019cd1798d657de5b5fed4198cb9fac0',
          type: 'identity',
          attributes: {
            actor: {
              actorType: 'AGENT',
              credentialKind: 'agent_key',
              agentIdSource: 'credential'
            },
            party: {
              partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
              displayName: null,
              handle: null
            },
            actingFor: { partyId: 'pty_019cd1798d617f65a79cb965dda9eac3' },
            agent: {
              agentId: 'agt_019cd1798d657de5b5fed4198cb9fac0',
              handle: null
            },
            permissions: []
          }
        }
      }
    ],
    [
      'non-array permissions',
      {
        data: {
          id: 'usr_019cd1798d657de5b5fed4198cb9fac0',
          type: 'identity',
          attributes: {
            actor: { actorType: 'USER', credentialKind: null, agentIdSource: null },
            party: {
              partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
              displayName: null,
              handle: null
            },
            actingFor: { partyId: 'pty_019cd1798d617f65a79cb965dda9eac3' },
            agent: null,
            permissions: 'payments.read'
          }
        }
      }
    ],
    [
      'non-object metadata',
      {
        data: {
          id: 'usr_019cd1798d657de5b5fed4198cb9fac0',
          type: 'identity',
          attributes: {
            actor: { actorType: 'USER', credentialKind: null, agentIdSource: null },
            party: {
              partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
              displayName: null,
              handle: null
            },
            actingFor: { partyId: 'pty_019cd1798d617f65a79cb965dda9eac3' },
            agent: null,
            permissions: []
          }
        },
        meta: 'req_123'
      }
    ]
  ])('fails closed on a malformed 2xx response with %s', async (_case, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const invocation = whoAmI.handleInvocation({
      input: {},
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    const error = await invocation.catch(cause => cause);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;
    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/read-only request.*safe to retry/i);
  });
});
