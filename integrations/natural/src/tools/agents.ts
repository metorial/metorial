import { SlateTool } from 'slates';
import { z } from 'zod';
import { jsonApiBody } from '../lib/envelopes';
import { naturalServiceError } from '../lib/errors';
import { paginationInputFields } from '../lib/pagination';
import {
  ensureAtLeastOneField,
  limitsObject,
  recipientObject,
  requireConfirm,
  requireIdempotencyKey
} from '../lib/validation';
import { spec } from '../spec';
import {
  confirmSchema,
  idempotencyKeySchema,
  limitsSchema,
  perTransactionLimitsSchema,
  rawRecordArraySchema,
  rawRecordSchema,
  recipientSchema
} from './schemas';
import {
  attributesBody,
  countOf,
  createClient,
  listRawResult,
  resourceResult,
  summaryListMessage
} from './shared';

const agentOutputSchema = z.object({
  agentId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  agent: rawRecordSchema
});

const agentListOutputSchema = z.object({
  agents: rawRecordArraySchema,
  pagination: z.object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable()
  })
});

const invitationStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELED'
]);

const legacyAgentInvitationsSuccessSchema = z
  .object({
    data: rawRecordArraySchema,
    meta: z
      .object({
        pagination: z
          .object({
            hasMore: z.boolean(),
            nextCursor: z.string().nullable()
          })
          .passthrough()
      })
      .passthrough()
  })
  .passthrough();

const legacyCustomerInvitationRecipientSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('email'),
      value: z.string()
    })
    .passthrough(),
  z
    .object({
      type: z.literal('phone'),
      value: z.string()
    })
    .passthrough(),
  z
    .object({
      type: z.literal('party_id'),
      value: z.string()
    })
    .passthrough()
]);

const legacyCustomerInvitationResourceSchema = z
  .object({
    type: z.literal('customerInvitation'),
    id: z.string(),
    attributes: z
      .object({
        recipient: legacyCustomerInvitationRecipientSchema,
        status: z.string().min(1),
        permissions: z.array(z.string()),
        limits: z
          .object({
            perTransaction: z.number().nullable().optional()
          })
          .passthrough()
          .nullable(),
        expiresAt: z.string(),
        createdAt: z.string(),
        updatedAt: z.string().nullable()
      })
      .passthrough(),
    relationships: z
      .object({
        agent: z
          .object({
            data: z
              .object({
                type: z.literal('agent'),
                id: z.string(),
                attributes: z
                  .object({
                    name: z.string().nullable(),
                    description: z.string().nullable(),
                    status: z.string().min(1)
                  })
                  .passthrough()
              })
              .passthrough()
          })
          .passthrough(),
        customerParty: z
          .object({
            data: z
              .object({
                type: z.literal('party'),
                id: z.string()
              })
              .passthrough()
              .nullable()
          })
          .passthrough()
      })
      .passthrough()
  })
  .passthrough();

const inviteAgentCustomerSuccessSchema = z
  .object({
    data: z.array(legacyCustomerInvitationResourceSchema),
    meta: z
      .object({
        emailFailures: z.array(z.string())
      })
      .passthrough()
  })
  .passthrough();

const isUriEncodable = (value: string) => {
  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
};

const hasWhitespaceOrControl = (value: string) =>
  Array.from(value).some(character => {
    const codePoint = character.codePointAt(0);
    return (
      /\s/u.test(character) ||
      (codePoint !== undefined &&
        (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)))
    );
  });

const revokeAgentInvitationIdSchema = z
  .string()
  .min(5, 'Agent invitation IDs require a non-empty value after adi_.')
  .startsWith('adi_', 'Agent invitation IDs use the adi_ prefix.')
  .refine(
    value => !hasWhitespaceOrControl(value),
    'Natural agent invitation IDs cannot contain whitespace or control characters.'
  )
  .refine(
    isUriEncodable,
    'Natural agent invitation ID must contain well-formed, URI-encodable Unicode.'
  );

const revokeAgentInvitationSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('agentDelegationInvitation'),
        id: revokeAgentInvitationIdSchema,
        attributes: z
          .object({
            status: z
              .string()
              .refine(value => value.trim().length > 0, 'Invitation status must not be blank.')
          })
          .passthrough(),
        relationships: z
          .object({
            agent: z
              .object({
                data: z
                  .object({
                    type: z.literal('agent'),
                    id: z.string().min(1)
                  })
                  .passthrough()
              })
              .passthrough(),
            customerParty: z
              .object({
                data: z
                  .object({
                    type: z.literal('party'),
                    id: z.string().min(1)
                  })
                  .passthrough()
                  .nullable()
              })
              .passthrough()
          })
          .passthrough()
      })
      .passthrough(),
    meta: z
      .object({
        deleted: z.union([z.literal(true), z.literal('true')])
      })
      .passthrough()
  })
  .passthrough();

const revokeAgentCustomerSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('customer'),
        id: z.string().min(1),
        attributes: z
          .object({
            status: z.string().min(1)
          })
          .passthrough()
      })
      .passthrough(),
    meta: z
      .object({
        deleted: z.union([z.literal(true), z.literal('true')])
      })
      .passthrough()
  })
  .passthrough();

const normalizeLegacyCustomerReference = (customerReference: string) =>
  z.string().email().safeParse(customerReference).success
    ? customerReference.toLowerCase()
    : customerReference;

const deleteAgentIdSchema = z
  .string()
  .min(5, 'Agent IDs require a non-empty value after agt_.')
  .startsWith('agt_', 'Agent IDs use the agt_ prefix.')
  .refine(isUriEncodable, 'Natural agent ID must be well-formed Unicode.');

const deleteAgentSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('agent'),
        id: deleteAgentIdSchema,
        attributes: z
          .object({
            status: z.string().min(1)
          })
          .passthrough()
      })
      .passthrough(),
    meta: z
      .object({
        deleted: z.literal(true)
      })
      .passthrough()
  })
  .passthrough();

export const listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: 'List Natural agents with optional status filtering and cursor pagination.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      status: z.enum(['ACTIVE', 'REVOKED']).optional().describe('Agent status filter.'),
      ...paginationInputFields
    })
  )
  .output(agentListOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list agents', 'get', '/agents', {
      params: {
        status: ctx.input.status,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      }
    });
    const output = listRawResult(envelope, 'agents');

    return {
      output,
      message: summaryListMessage(countOf(output, 'agents'), 'agents')
    };
  })
  .build();

export const createAgent = SlateTool.create(spec, {
  name: 'Create Agent',
  key: 'create_agent',
  description:
    'Create a Natural agent for the authenticated party. Provide an idempotency key and reuse it when retrying.'
})
  .input(
    z.object({
      name: z.string().min(1).max(100).describe('Agent display name.'),
      description: z.string().max(100).optional().describe('Agent description.'),
      limits: limitsSchema.describe(
        'Optional owner-party spending limits. Agent credentials cannot set these limits.'
      ),
      walletId: z
        .string()
        .regex(/^wal_[0-9a-f]{32}$/)
        .optional()
        .describe(
          "Wallet to grant the agent access to. Defaults to the party's default wallet."
        ),
      idempotencyKey: idempotencyKeySchema
    })
  )
  .output(
    z.object({
      agentId: z.string().optional(),
      type: z.string().optional(),
      name: z.string().optional(),
      description: z.string().nullable().optional(),
      handle: z.string().nullable().optional(),
      status: z.string().optional(),
      limits: z
        .object({
          perTransaction: z.number().int().positive().nullable().optional(),
          perDay: z.number().int().positive().nullable().optional(),
          perMonth: z.number().int().positive().nullable().optional()
        })
        .nullable()
        .optional(),
      createdAt: z.string().nullable().optional(),
      createdBy: z.string().nullable().optional(),
      lastActiveAt: z.string().nullable().optional(),
      partyId: z.string().optional(),
      agent: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    requireIdempotencyKey(ctx.input.idempotencyKey, 'create an agent');
    const client = createClient(ctx);
    const envelope = await client.request('create agent', 'post', '/agents', {
      idempotencyKey: ctx.input.idempotencyKey,
      body: jsonApiBody(
        attributesBody({
          name: ctx.input.name,
          description: ctx.input.description,
          limits: limitsObject(ctx.input.limits),
          walletId: ctx.input.walletId
        })
      )
    });
    const resource = resourceResult(envelope, 'agentId', 'agent');
    const attributes = resource.agent.attributes ?? {};
    const party = resource.agent.relationships?.party?.data;
    const output = {
      ...resource,
      name: typeof attributes.name === 'string' ? attributes.name : undefined,
      description:
        typeof attributes.description === 'string' || attributes.description === null
          ? attributes.description
          : undefined,
      handle:
        typeof attributes.handle === 'string' || attributes.handle === null
          ? attributes.handle
          : undefined,
      limits:
        (typeof attributes.limits === 'object' && !Array.isArray(attributes.limits)) ||
        attributes.limits === null
          ? attributes.limits
          : undefined,
      createdAt:
        typeof attributes.createdAt === 'string' || attributes.createdAt === null
          ? attributes.createdAt
          : undefined,
      createdBy:
        typeof attributes.createdBy === 'string' || attributes.createdBy === null
          ? attributes.createdBy
          : undefined,
      lastActiveAt:
        typeof attributes.lastActiveAt === 'string' || attributes.lastActiveAt === null
          ? attributes.lastActiveAt
          : undefined,
      partyId: typeof party?.id === 'string' ? party.id : undefined
    };

    return {
      output,
      message: `Created Natural agent **${ctx.input.name}**.`
    };
  })
  .build();

export const getAgent = SlateTool.create(spec, {
  name: 'Get Agent',
  key: 'get_agent',
  description:
    'Retrieve a Natural agent by ID, including its name, handle, status, owner limits, timestamps, owning party, and raw provider record.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      agentId: z
        .string()
        .regex(/^agt_[0-9a-f]{32}$/)
        .describe('Natural agent ID (agt_ followed by 32 lowercase hexadecimal characters).')
    })
  )
  .output(
    z.object({
      agentId: z.string().optional(),
      type: z.string().optional(),
      name: z.string().optional(),
      description: z.string().nullable().optional(),
      handle: z.string().nullable().optional(),
      status: z.string().optional(),
      limits: z
        .object({
          perTransaction: z.number().int().positive().nullable().optional(),
          perDay: z.number().int().positive().nullable().optional(),
          perMonth: z.number().int().positive().nullable().optional()
        })
        .nullable()
        .optional(),
      createdAt: z.string().nullable().optional(),
      createdBy: z.string().nullable().optional(),
      lastActiveAt: z.string().nullable().optional(),
      partyId: z.string().optional(),
      agent: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('get agent', 'get', `/agents/${ctx.input.agentId}`);
    const resource = resourceResult(envelope, 'agentId', 'agent');
    const attributes = resource.agent.attributes ?? {};
    const party = resource.agent.relationships?.party?.data;
    const output = {
      ...resource,
      name: typeof attributes.name === 'string' ? attributes.name : undefined,
      description:
        typeof attributes.description === 'string' || attributes.description === null
          ? attributes.description
          : undefined,
      handle:
        typeof attributes.handle === 'string' || attributes.handle === null
          ? attributes.handle
          : undefined,
      limits:
        (typeof attributes.limits === 'object' && !Array.isArray(attributes.limits)) ||
        attributes.limits === null
          ? attributes.limits
          : undefined,
      createdAt:
        typeof attributes.createdAt === 'string' || attributes.createdAt === null
          ? attributes.createdAt
          : undefined,
      createdBy:
        typeof attributes.createdBy === 'string' || attributes.createdBy === null
          ? attributes.createdBy
          : undefined,
      lastActiveAt:
        typeof attributes.lastActiveAt === 'string' || attributes.lastActiveAt === null
          ? attributes.lastActiveAt
          : undefined,
      partyId: typeof party?.id === 'string' ? party.id : undefined
    };

    return {
      output,
      message: `Retrieved agent **${ctx.input.agentId}**.`
    };
  })
  .build();

export const updateAgent = SlateTool.create(spec, {
  name: 'Update Agent',
  key: 'update_agent',
  description:
    "Update a Natural agent's name, description, handle slug, or owner spending limits. Provide an idempotency key and reuse it when retrying the same update. Omitted top-level fields remain unchanged.",
  constraints: [
    'Agent credentials cannot change limits.',
    'Within a limits object, each omitted or null limit window clears that limit.',
    'Only the same agent can reclaim a released slug for 14 days.'
  ]
})
  .input(
    z.object({
      agentId: z
        .string()
        .regex(/^agt_[0-9a-f]{32}$/)
        .describe('Natural agent ID (agt_ followed by 32 lowercase hexadecimal characters).'),
      name: z
        .string()
        .min(1)
        .max(100)
        .nullable()
        .optional()
        .describe('Updated name, or null to clear.'),
      description: z
        .string()
        .max(100)
        .nullable()
        .optional()
        .describe('Updated description, or null to clear.'),
      slug: z
        .string()
        .regex(/^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/)
        .nullable()
        .optional()
        .describe(
          'Updated handle slug, or null to clear. Only the same agent can reclaim a released slug for 14 days.'
        ),
      limits: limitsSchema
        .nullable()
        .optional()
        .describe(
          'Updated limits object, or null to clear all limits. Within an object, each omitted or null window clears that limit; agent credentials cannot change limits.'
        ),
      idempotencyKey: idempotencyKeySchema
    })
  )
  .output(
    agentOutputSchema.extend({
      name: z.string().optional(),
      description: z.string().nullable().optional(),
      handle: z.string().nullable().optional(),
      limits: z
        .object({
          perTransaction: z.number().int().positive().nullable().optional(),
          perDay: z.number().int().positive().nullable().optional(),
          perMonth: z.number().int().positive().nullable().optional()
        })
        .nullable()
        .optional(),
      createdAt: z.string().nullable().optional(),
      createdBy: z.string().nullable().optional(),
      lastActiveAt: z.string().nullable().optional(),
      partyId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    requireIdempotencyKey(ctx.input.idempotencyKey, 'update an agent');
    if (ctx.auth.keyType === 'agent_key' && ctx.input.limits !== undefined) {
      throw naturalServiceError(
        'Agent credentials cannot change limits. Authenticate with a party key to update agent limits.'
      );
    }

    const body = attributesBody({
      name: ctx.input.name,
      description: ctx.input.description,
      slug: ctx.input.slug,
      limits:
        ctx.input.limits === undefined
          ? undefined
          : ctx.input.limits === null
            ? null
            : limitsObject(ctx.input.limits)
    });
    ensureAtLeastOneField(body, 'agent update');

    const client = createClient(ctx);
    const envelope = await client.request(
      'update agent',
      'patch',
      `/agents/${ctx.input.agentId}`,
      {
        idempotencyKey: ctx.input.idempotencyKey,
        body: jsonApiBody(body)
      }
    );
    const resource = resourceResult(envelope, 'agentId', 'agent');
    const attributes = resource.agent.attributes ?? {};
    const party = resource.agent.relationships?.party?.data;
    const output = {
      ...resource,
      name: typeof attributes.name === 'string' ? attributes.name : undefined,
      description:
        typeof attributes.description === 'string' || attributes.description === null
          ? attributes.description
          : undefined,
      handle:
        typeof attributes.handle === 'string' || attributes.handle === null
          ? attributes.handle
          : undefined,
      limits:
        (typeof attributes.limits === 'object' && !Array.isArray(attributes.limits)) ||
        attributes.limits === null
          ? attributes.limits
          : undefined,
      createdAt:
        typeof attributes.createdAt === 'string' || attributes.createdAt === null
          ? attributes.createdAt
          : undefined,
      createdBy:
        typeof attributes.createdBy === 'string' || attributes.createdBy === null
          ? attributes.createdBy
          : undefined,
      lastActiveAt:
        typeof attributes.lastActiveAt === 'string' || attributes.lastActiveAt === null
          ? attributes.lastActiveAt
          : undefined,
      partyId: typeof party?.id === 'string' ? party.id : undefined
    };

    return {
      output,
      message: `Updated agent **${ctx.input.agentId}**.`
    };
  })
  .build();

export const deleteAgent = SlateTool.create(spec, {
  name: 'Delete Agent',
  key: 'delete_agent',
  description:
    "Delete a Natural agent by ID and revoke the agent's active customer authorizations and pending invitations. Provide an idempotency key and reuse it when retrying the same deletion.",
  tags: { destructive: true }
})
  .input(
    z.object({
      agentId: deleteAgentIdSchema.describe(
        'Natural agent ID with an agt_ prefix and non-empty opaque suffix.'
      ),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      agentId: z.string().min(1).describe('Deleted Natural agent ID.'),
      type: z.literal('agent').describe('Natural resource type.'),
      status: z.string().min(1).describe('Agent status returned after deletion.'),
      agent: rawRecordSchema.describe(
        'Raw Natural agent resource returned after deletion, including additive provider fields.'
      ),
      deleted: z.literal(true).describe('Natural confirmed the agent was deleted.'),
      meta: rawRecordSchema.describe(
        'Raw Natural response metadata, preserving deletion confirmation and additive fields.'
      )
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'delete this agent');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'delete an agent');
    const client = createClient(ctx);
    const envelope = await client.request(
      'delete agent',
      'delete',
      `/agents/${encodeURIComponent(ctx.input.agentId)}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );
    const response = deleteAgentSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when deleting an agent. Verify agent state in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.agentId) {
      throw naturalServiceError(
        'Natural returned a different agent than the one requested when deleting it. Verify agent state in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }

    const { data: agent, meta } = response.data;

    return {
      output: {
        agentId: agent.id,
        type: agent.type,
        status: agent.attributes.status,
        agent,
        deleted: meta.deleted,
        meta
      },
      message: `Deleted agent **${ctx.input.agentId}**.`
    };
  })
  .build();

export const listAgentCustomers = SlateTool.create(spec, {
  name: 'List Agent Customers',
  key: 'list_agent_customers',
  description:
    'DEPRECATED — use `list_customers` instead. List customers delegated to a Natural agent.',
  instructions: [
    'Use `list_customers` for new calls. Keep `list_agent_customers` only for compatibility with existing workflows.'
  ],
  tags: { readOnly: true, deprecated: true }
})
  .input(
    z.object({
      agentId: z.string().min(1).describe('Natural agent ID.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      customers: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'list agent customers',
      'get',
      `/agents/${ctx.input.agentId}/customers`,
      {
        params: {
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        }
      }
    );
    const output = listRawResult(envelope, 'customers');

    return {
      output,
      message: summaryListMessage(countOf(output, 'customers'), 'agent customers')
    };
  })
  .build();

export const inviteAgentCustomer = SlateTool.create(spec, {
  name: 'Invite Agent Customer',
  key: 'invite_agent_customer',
  description:
    'DEPRECATED — use `create_customer_invitations` instead. Invite 1-100 customers to authorize a Natural agent with specific permissions and an optional per-transaction limit. Provide an idempotency key and reuse it when retrying the same invitation batch.',
  instructions: [
    'Use `create_customer_invitations` for new calls. Keep `invite_agent_customer` only for compatibility with existing workflows.'
  ],
  tags: { deprecated: true },
  constraints: [
    'Natural sends email invitations automatically for email recipients.',
    'Invitation expiration defaults to 7 days when omitted.'
  ]
})
  .input(
    z.object({
      agentId: z
        .string()
        .regex(/^agt_[0-9a-f]{32}$/)
        .describe('Natural agent ID (agt_ followed by 32 lowercase hexadecimal characters).'),
      recipients: z
        .array(
          recipientSchema.pipe(
            z.discriminatedUnion('type', [
              z.object({
                type: z.literal('email'),
                value: z.string().email().describe('Recipient email address.')
              }),
              z.object({
                type: z.literal('phone'),
                value: z.string().min(1).describe('Recipient phone number.')
              }),
              z.object({
                type: z.literal('party_id'),
                value: z
                  .string()
                  .regex(
                    /^pty_[0-9a-f]{32}$/,
                    'Party recipients use pty_ + 32 lowercase hexadecimal characters.'
                  )
              })
            ])
          )
        )
        .min(1)
        .max(100)
        .describe('Customer recipients to invite.'),
      permissions: z
        .array(
          z.enum([
            'payments.read',
            'payments.create',
            'external_accounts.create',
            'wallets.read',
            'wallets.update',
            'party.read',
            'party.update'
          ])
        )
        .min(1)
        .describe('Permissions the customers are being asked to grant this agent.'),
      limits: perTransactionLimitsSchema,
      expiresAt: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Optional ISO 8601 expiration timestamp. Defaults to 7 days from creation.'),
      idempotencyKey: idempotencyKeySchema
    })
  )
  .output(
    z.object({
      invitationIds: z.array(z.string()),
      invitations: rawRecordArraySchema,
      emailFailures: z.array(z.string()),
      meta: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    requireIdempotencyKey(ctx.input.idempotencyKey, 'invite agent customers');
    const client = createClient(ctx);
    const envelope = await client.request(
      'invite agent customer',
      'post',
      `/agents/${ctx.input.agentId}/customers`,
      {
        idempotencyKey: ctx.input.idempotencyKey,
        body: attributesBody({
          recipients: ctx.input.recipients.map(recipientObject),
          permissions: ctx.input.permissions,
          limits: ctx.input.limits,
          expiresAt: ctx.input.expiresAt
        })
      }
    );
    const response = inviteAgentCustomerSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when inviting agent customers. Verify invitation state in Natural, then retry this invitation batch with the same idempotency key.',
        'natural_response_error'
      );
    }

    const { data: invitations, meta } = response.data;
    const { emailFailures } = meta;
    const invitationIds = invitations.map(invitation => invitation.id);

    return {
      output: {
        invitationIds,
        invitations,
        emailFailures,
        meta
      },
      message:
        `Created **${invitations.length}** agent customer invitations.` +
        (emailFailures.length > 0
          ? ` Natural could not send email for **${emailFailures.length}** persisted invitations.`
          : '')
    };
  })
  .build();

export const revokeAgentCustomer = SlateTool.create(spec, {
  name: 'Revoke Agent Customer',
  key: 'revoke_agent_customer',
  description:
    "DEPRECATED — use `revoke_customer_agent` instead. Revoke a Natural agent's access to act for one customer using the legacy agent-side endpoint. Provide an idempotency key and reuse it when retrying. Returns the revoked relationship status, customer and agent references, raw customer record, and deletion metadata.",
  instructions: [
    'Use `revoke_customer_agent` for new calls. Keep `revoke_agent_customer` only for compatibility with existing workflows.'
  ],
  tags: { destructive: true, deprecated: true }
})
  .input(
    z.object({
      agentId: z
        .string()
        .min(1)
        .refine(isUriEncodable, 'Natural agent reference must be well-formed Unicode.')
        .describe('Opaque non-empty Natural agent reference.'),
      customerId: z
        .string()
        .min(1)
        .refine(isUriEncodable, 'Natural customer reference must be well-formed Unicode.')
        .describe(
          'Opaque non-empty customer reference accepted by the legacy endpoint, such as a party ID or customer email.'
        ),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('Natural agent whose customer access was revoked.'),
      customerReference: z
        .string()
        .optional()
        .describe('Provider response ID: a customer party ID when known, otherwise an email.'),
      customerId: z
        .string()
        .min(1)
        .describe('Provider response ID, including a lowercased email for email references.'),
      type: z.literal('customer'),
      status: z.string().min(1),
      customer: rawRecordSchema.describe('Raw Natural customer relationship resource.'),
      deleted: z.literal(true),
      meta: rawRecordSchema.describe(
        'Raw Natural response metadata, including deletion state.'
      )
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'revoke this agent customer');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'revoke an agent customer');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke agent customer',
      'delete',
      `/agents/${encodeURIComponent(ctx.input.agentId)}/customers/${encodeURIComponent(ctx.input.customerId)}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );
    const response = revokeAgentCustomerSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when revoking an agent customer. Verify customer access in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }

    const requestedCustomerReference = normalizeLegacyCustomerReference(ctx.input.customerId);
    if (response.data.data.id !== requestedCustomerReference) {
      throw naturalServiceError(
        'Natural returned a different customer reference than the one requested when revoking an agent customer. Verify customer access in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }

    const { data: customer, meta } = response.data;

    return {
      output: {
        agentId: ctx.input.agentId,
        customerReference: customer.id,
        customerId: customer.id,
        type: customer.type,
        status: customer.attributes.status,
        customer,
        deleted: true,
        meta
      },
      message: `Revoked customer **${ctx.input.customerId}** from agent **${ctx.input.agentId}**.`
    };
  })
  .build();

export const listAgentInvitations = SlateTool.create(spec, {
  name: 'List Agent Invitations',
  key: 'list_agent_invitations',
  description:
    'List Natural agent delegation invitations through the provider-deprecated legacy endpoint. Filter by lifecycle status, customer email, or agent ID. Returns raw invitation resources, pagination, and raw provider metadata.',
  instructions: [
    'Retain this tool only for compatibility with existing workflows. Natural has no documented current equivalent.'
  ],
  constraints: [
    'Natural marks this provider endpoint as deprecated and has no documented current equivalent.'
  ],
  tags: { readOnly: true, deprecated: true }
})
  .input(
    z.object({
      status: z
        .array(invitationStatusSchema)
        .optional()
        .describe('Match invitations in any of these lifecycle statuses.'),
      customerEmail: z.string().optional().describe('Filter by customer email address.'),
      agentId: z.string().optional().describe('Filter by Natural agent ID.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      invitations: rawRecordArraySchema.describe(
        'Raw Natural invitation resources, including additive provider fields.'
      ),
      pagination: z
        .object({
          hasMore: z.boolean(),
          nextCursor: z.string().nullable()
        })
        .passthrough(),
      meta: rawRecordSchema.describe('Raw Natural response metadata.')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'list agent invitations',
      'get',
      '/agents/invitations',
      {
        params: {
          status: ctx.input.status,
          customerEmail: ctx.input.customerEmail,
          agentId: ctx.input.agentId,
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        }
      }
    );
    const response = legacyAgentInvitationsSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when listing agent invitations. This is a read-only request, so it is safe to retry.',
        'natural_response_error'
      );
    }

    const { data: invitations, meta } = response.data;
    const output = {
      invitations,
      pagination: meta.pagination,
      meta
    };

    return {
      output,
      message: summaryListMessage(countOf(output, 'invitations'), 'agent invitations')
    };
  })
  .build();

export const revokeAgentInvitation = SlateTool.create(spec, {
  name: 'Revoke Agent Invitation',
  key: 'revoke_agent_invitation',
  description:
    'DEPRECATED — use `revoke_customer_invitation` instead. Cancel a pending Natural agent delegation invitation through the legacy agent-side endpoint. Returns the canceled invitation, its ID and status, and deletion metadata. Provide an idempotency key and reuse it when retrying the same revocation.',
  instructions: [
    'Use `revoke_customer_invitation` for new calls. Keep `revoke_agent_invitation` only for compatibility with existing workflows.'
  ],
  tags: { destructive: true, deprecated: true }
})
  .input(
    z.object({
      id: revokeAgentInvitationIdSchema.describe(
        'Natural agent delegation invitation ID. Treat the adi_* value as opaque.'
      ),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      invitationId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      invitation: rawRecordSchema,
      deleted: z.boolean(),
      meta: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'revoke this agent invitation');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'revoke an agent invitation');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke agent invitation',
      'delete',
      `/agents/invitations/${encodeURIComponent(ctx.input.id)}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );
    const response = revokeAgentInvitationSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when revoking an agent invitation. Verify invitation state in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.id) {
      throw naturalServiceError(
        'Natural returned a different agent invitation than the one requested when revoking it. Verify invitation state in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }

    const { data: invitation, meta } = response.data;

    return {
      output: {
        invitationId: invitation.id,
        type: invitation.type,
        status: invitation.attributes.status,
        invitation,
        deleted: true,
        meta
      },
      message: `Revoked agent invitation **${ctx.input.id}**.`
    };
  })
  .build();
