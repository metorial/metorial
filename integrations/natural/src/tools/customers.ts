import { SlateTool } from 'slates';
import { z } from 'zod';
import { jsonApiBody } from '../lib/envelopes';
import { naturalServiceError } from '../lib/errors';
import { customerPaginationInputFields } from '../lib/pagination';
import { recipientObject, requireConfirm } from '../lib/validation';
import { spec } from '../spec';
import {
  confirmSchema,
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

const MAX_CUSTOMER_INVITATION_EXPIRATION_MS = 90 * 24 * 60 * 60 * 1000;

const agentResourceIdentifierSchema = z
  .object({
    type: z.literal('agent'),
    id: z.string().regex(/^agt_[0-9a-f]{32}$/)
  })
  .passthrough();

const partyResourceIdentifierSchema = z
  .object({
    type: z.literal('party'),
    id: z.string().regex(/^pty_[0-9a-f]{32}$/)
  })
  .passthrough();

const failedCustomerInvitationRecipientSchema = z
  .object({
    recipient: rawRecordSchema,
    reason: z.string()
  })
  .passthrough();

const createCustomerInvitationsSuccessSchema = z
  .object({
    data: z.array(
      z
        .object({
          type: z.literal('agentDelegationInvitation'),
          id: z.string().regex(/^adi_[0-9a-f]{32}$/),
          attributes: rawRecordSchema,
          relationships: z
            .object({
              agent: z
                .object({
                  data: agentResourceIdentifierSchema
                })
                .passthrough(),
              customerParty: z
                .object({
                  data: partyResourceIdentifierSchema.nullable()
                })
                .passthrough()
            })
            .passthrough()
        })
        .passthrough()
    ),
    meta: z
      .object({
        failedRecipients: z.array(failedCustomerInvitationRecipientSchema)
      })
      .passthrough()
  })
  .passthrough();

const customerListOutputSchema = z.object({
  customers: rawRecordArraySchema,
  pagination: z.object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable()
  })
});

const customerOutputSchema = z.object({
  customerId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  customer: rawRecordSchema
});

const customerInvitationOutputSchema = z.object({
  invitations: rawRecordArraySchema,
  failedRecipients: z.array(z.any())
});

export const listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: 'List Natural customers. Natural defaults this endpoint to 20 records.',
  tags: { readOnly: true }
})
  .input(z.object(customerPaginationInputFields))
  .output(customerListOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list customers', 'get', '/customers', {
      params: {
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      }
    });
    const output = listRawResult(envelope, 'customers');

    return {
      output,
      message: summaryListMessage(countOf(output, 'customers'), 'customers')
    };
  })
  .build();

export const getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description:
    'Retrieve a Natural customer who has authorized one of your agents by party ID, including delegation and connected-agent details.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z
        .string()
        .regex(/^pty_[0-9a-f]{32}$/)
        .describe('Natural customer party ID (pty_*).')
    })
  )
  .output(
    customerOutputSchema.extend({
      name: z.string().optional(),
      email: z.string().nullable().optional(),
      avatarUrl: z.string().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      delegationId: z.string().optional(),
      status: z.string().optional().describe('Delegation status.'),
      delegation: z
        .object({
          id: z.string().optional(),
          status: z.string().optional(),
          permissions: z.array(z.string()).optional(),
          createdAt: z.string().optional()
        })
        .passthrough()
        .optional(),
      agents: z
        .array(
          z
            .object({
              id: z.string().optional(),
              name: z.string().nullable().optional(),
              status: z.string().optional(),
              permissions: z.array(z.string()).optional(),
              limits: rawRecordSchema.nullable().optional()
            })
            .passthrough()
        )
        .optional(),
      relationships: rawRecordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get customer',
      'get',
      `/customers/${ctx.input.customerId}`
    );
    const resource = resourceResult(envelope, 'customerId', 'customer');
    const attributes = resource.customer.attributes ?? {};
    const delegation =
      typeof attributes.delegation === 'object' &&
      attributes.delegation !== null &&
      !Array.isArray(attributes.delegation)
        ? attributes.delegation
        : undefined;
    const relationships =
      typeof resource.customer.relationships === 'object' &&
      resource.customer.relationships !== null &&
      !Array.isArray(resource.customer.relationships)
        ? resource.customer.relationships
        : undefined;

    return {
      output: {
        ...resource,
        name: typeof attributes.name === 'string' ? attributes.name : undefined,
        email:
          typeof attributes.email === 'string' || attributes.email === null
            ? attributes.email
            : undefined,
        avatarUrl:
          typeof attributes.avatarUrl === 'string' || attributes.avatarUrl === null
            ? attributes.avatarUrl
            : undefined,
        createdAt:
          typeof attributes.createdAt === 'string' || attributes.createdAt === null
            ? attributes.createdAt
            : undefined,
        delegationId: typeof delegation?.id === 'string' ? delegation.id : undefined,
        status: typeof delegation?.status === 'string' ? delegation.status : undefined,
        delegation,
        agents: Array.isArray(attributes.agents) ? attributes.agents : undefined,
        relationships
      },
      message: `Retrieved customer **${ctx.input.customerId}**.`
    };
  })
  .build();

export const listCustomerInvitations = SlateTool.create(spec, {
  name: 'List Customer Invitations',
  key: 'list_customer_invitations',
  description:
    'List pending Natural customer delegation invitations grouped by recipient, including the actionable per-agent invitation IDs. Natural defaults the page size to 20.',
  tags: { readOnly: true }
})
  .input(z.object(customerPaginationInputFields))
  .output(
    z.object({
      invitations: z.array(
        z.object({
          id: z.string().optional().describe('Recipient email used as the resource ID.'),
          type: z.string().optional(),
          attributes: rawRecordSchema.optional(),
          relationships: rawRecordSchema.optional(),
          status: z.string().optional(),
          recipientEmail: z.string().optional(),
          partyId: z.string().optional(),
          party: rawRecordSchema.nullable().optional(),
          createdAt: z.string().optional(),
          invitationIds: z.array(z.string()),
          agentIds: z.array(z.string()),
          agentInvitations: z.array(
            z.object({
              invitationId: z.string().optional(),
              agentId: z.string().optional(),
              agentName: z.string().nullable().optional(),
              agent: rawRecordSchema.optional(),
              permissions: z.array(z.string()).optional(),
              url: z.string().optional(),
              createdAt: z.string().optional(),
              expiresAt: z.string().nullable().optional(),
              tags: rawRecordSchema.optional(),
              invitation: rawRecordSchema
            })
          ),
          invitation: rawRecordSchema
        })
      ),
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      }),
      meta: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'list customer invitations',
      'get',
      '/customers/invitations',
      {
        params: {
          cursor: ctx.input.cursor,
          limit: ctx.input.limit
        }
      }
    );
    const rawOutput = listRawResult(envelope, 'invitations');
    const invitations = rawOutput.invitations.map(invitation => {
      const attributes =
        typeof invitation.attributes === 'object' &&
        invitation.attributes !== null &&
        !Array.isArray(invitation.attributes)
          ? invitation.attributes
          : {};
      const party =
        (typeof attributes.party === 'object' &&
          attributes.party !== null &&
          !Array.isArray(attributes.party)) ||
        attributes.party === null
          ? attributes.party
          : undefined;
      const rawAgentInvitations: unknown[] = Array.isArray(attributes.agentInvitations)
        ? attributes.agentInvitations
        : [];
      const agentInvitations = rawAgentInvitations
        .filter(
          (agentInvitation): agentInvitation is Record<string, any> =>
            typeof agentInvitation === 'object' &&
            agentInvitation !== null &&
            !Array.isArray(agentInvitation)
        )
        .map(agentInvitation => {
          const agent =
            typeof agentInvitation.agent === 'object' &&
            agentInvitation.agent !== null &&
            !Array.isArray(agentInvitation.agent)
              ? agentInvitation.agent
              : undefined;

          return {
            ...agentInvitation,
            invitationId:
              typeof agentInvitation.invitationId === 'string'
                ? agentInvitation.invitationId
                : undefined,
            agentId: typeof agent?.id === 'string' ? agent.id : undefined,
            agentName:
              typeof agent?.name === 'string' || agent?.name === null ? agent.name : undefined,
            agent,
            permissions: Array.isArray(agentInvitation.permissions)
              ? agentInvitation.permissions.filter(
                  (permission: unknown): permission is string => typeof permission === 'string'
                )
              : undefined,
            url: typeof agentInvitation.url === 'string' ? agentInvitation.url : undefined,
            createdAt:
              typeof agentInvitation.createdAt === 'string'
                ? agentInvitation.createdAt
                : undefined,
            expiresAt:
              typeof agentInvitation.expiresAt === 'string' ||
              agentInvitation.expiresAt === null
                ? agentInvitation.expiresAt
                : undefined,
            tags:
              typeof agentInvitation.tags === 'object' &&
              agentInvitation.tags !== null &&
              !Array.isArray(agentInvitation.tags)
                ? agentInvitation.tags
                : undefined,
            invitation: agentInvitation
          };
        });
      const relationships =
        typeof invitation.relationships === 'object' &&
        invitation.relationships !== null &&
        !Array.isArray(invitation.relationships)
          ? invitation.relationships
          : undefined;

      return {
        ...invitation,
        status: typeof attributes.status === 'string' ? attributes.status : undefined,
        recipientEmail:
          typeof attributes.email === 'string'
            ? attributes.email
            : typeof invitation.id === 'string'
              ? invitation.id
              : undefined,
        partyId: party && typeof party.id === 'string' ? party.id : undefined,
        party,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        invitationIds: agentInvitations.flatMap(agentInvitation =>
          agentInvitation.invitationId ? [agentInvitation.invitationId] : []
        ),
        agentIds: agentInvitations.flatMap(agentInvitation =>
          agentInvitation.agentId ? [agentInvitation.agentId] : []
        ),
        agentInvitations,
        relationships,
        invitation
      };
    });
    const meta =
      typeof envelope === 'object' &&
      envelope !== null &&
      !Array.isArray(envelope) &&
      'meta' in envelope &&
      typeof envelope.meta === 'object' &&
      envelope.meta !== null &&
      !Array.isArray(envelope.meta)
        ? envelope.meta
        : {};
    const output = {
      ...rawOutput,
      invitations,
      meta
    };

    return {
      output,
      message: summaryListMessage(
        countOf(output, 'invitations'),
        'customer invitation recipient groups'
      )
    };
  })
  .build();

export const createCustomerInvitations = SlateTool.create(spec, {
  name: 'Create Customer Invitations',
  key: 'create_customer_invitations',
  description:
    'Create Natural customer delegation invitations for 1-100 email, phone, or party recipients and 1-50 agents. Returns one actionable invitation ID per recipient-agent pair plus failed-recipient metadata. This endpoint is not documented as idempotent.',
  constraints: [
    'Email invitations are delivered automatically; deliver each returned invitation URL yourself for phone recipients.',
    'Invitation expiration defaults to 30 days and cannot be more than 90 days from creation.'
  ]
})
  .input(
    z.object({
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
                    'Party recipients use pty_ + 32 hex characters.'
                  )
              })
            ])
          )
        )
        .min(1)
        .max(100)
        .describe('Recipients to invite.'),
      agents: z
        .array(
          z.object({
            agentId: z
              .string()
              .regex(/^agt_[0-9a-f]{32}$/, 'Agent IDs use agt_ + 32 hex characters.'),
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
              .describe('Natural permissions to grant this agent.'),
            limits: perTransactionLimitsSchema
          })
        )
        .min(1)
        .max(50)
        .describe('Agents the invited customer can delegate to.'),
      expiresAt: z
        .string()
        .datetime({ offset: true })
        .optional()
        .refine(
          expiresAt =>
            expiresAt === undefined ||
            Date.parse(expiresAt) <= Date.now() + MAX_CUSTOMER_INVITATION_EXPIRATION_MS,
          'Invitation expiration cannot be more than 90 days from creation.'
        )
        .describe(
          'Optional ISO 8601 expiration timestamp. Defaults to 30 days from creation and cannot exceed 90 days.'
        ),
      tags: z
        .record(
          z
            .string()
            .min(1)
            .max(128)
            .regex(/^[a-zA-Z0-9_]+$/),
          z.string().min(1).max(256)
        )
        .optional()
        .describe(
          'Optional non-sensitive metadata applied to every invitation. Keys use letters, numbers, and underscores; values are 1-256 characters.'
        )
    })
  )
  .output(
    customerInvitationOutputSchema.extend({
      invitationIds: z.array(z.string()),
      invitations: z.array(
        z.object({
          invitationId: z.string().optional(),
          type: z.string().optional(),
          status: z.string().optional(),
          effectiveStatus: z.string().optional(),
          recipient: z.object({
            email: z.string().optional(),
            phone: z.string().nullable().optional(),
            customerPartyId: z.string().nullable().optional()
          }),
          url: z.string().optional(),
          agentId: z.string().optional(),
          agentName: z.string().optional(),
          permissions: z.array(z.string()).optional(),
          limits: rawRecordSchema.nullable().optional(),
          expiresAt: z.string().optional(),
          acceptedAt: z.string().nullable().optional(),
          declinedAt: z.string().nullable().optional(),
          cancelReason: z.string().nullable().optional(),
          tags: rawRecordSchema.optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          relationships: rawRecordSchema.optional(),
          invitation: rawRecordSchema
        })
      ),
      failedRecipients: z.array(failedCustomerInvitationRecipientSchema),
      meta: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'create customer invitations',
      'post',
      '/customers/invitations',
      {
        body: jsonApiBody(
          attributesBody({
            recipients: ctx.input.recipients.map(recipientObject),
            agents: ctx.input.agents,
            expiresAt: ctx.input.expiresAt,
            tags: ctx.input.tags
          })
        )
      }
    );
    const response = createCustomerInvitationsSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when creating customer invitations. Verify invitation state in Natural before retrying this non-idempotent request.',
        'natural_response_error'
      );
    }

    const { data: rawInvitations, meta } = response.data;
    const invitations = rawInvitations.map(invitation => {
      const attributes =
        typeof invitation.attributes === 'object' &&
        invitation.attributes !== null &&
        !Array.isArray(invitation.attributes)
          ? invitation.attributes
          : {};
      const relationships =
        typeof invitation.relationships === 'object' &&
        invitation.relationships !== null &&
        !Array.isArray(invitation.relationships)
          ? invitation.relationships
          : undefined;
      const agent =
        typeof relationships?.agent?.data === 'object' &&
        relationships.agent.data !== null &&
        !Array.isArray(relationships.agent.data)
          ? relationships.agent.data
          : undefined;
      const customerParty = relationships?.customerParty?.data;

      return {
        invitationId: typeof invitation.id === 'string' ? invitation.id : undefined,
        type: typeof invitation.type === 'string' ? invitation.type : undefined,
        status: typeof attributes.status === 'string' ? attributes.status : undefined,
        effectiveStatus:
          typeof attributes.effectiveStatus === 'string'
            ? attributes.effectiveStatus
            : undefined,
        recipient: {
          email: typeof attributes.email === 'string' ? attributes.email : undefined,
          phone:
            typeof attributes.phone === 'string' || attributes.phone === null
              ? attributes.phone
              : undefined,
          customerPartyId:
            typeof customerParty?.id === 'string'
              ? customerParty.id
              : customerParty === null
                ? null
                : undefined
        },
        url: typeof attributes.url === 'string' ? attributes.url : undefined,
        agentId: typeof agent?.id === 'string' ? agent.id : undefined,
        agentName: typeof attributes.agentName === 'string' ? attributes.agentName : undefined,
        permissions: Array.isArray(attributes.permissions)
          ? attributes.permissions.filter(
              (permission: unknown): permission is string => typeof permission === 'string'
            )
          : undefined,
        limits:
          (typeof attributes.limits === 'object' && !Array.isArray(attributes.limits)) ||
          attributes.limits === null
            ? attributes.limits
            : undefined,
        expiresAt: typeof attributes.expiresAt === 'string' ? attributes.expiresAt : undefined,
        acceptedAt:
          typeof attributes.acceptedAt === 'string' || attributes.acceptedAt === null
            ? attributes.acceptedAt
            : undefined,
        declinedAt:
          typeof attributes.declinedAt === 'string' || attributes.declinedAt === null
            ? attributes.declinedAt
            : undefined,
        cancelReason:
          typeof attributes.cancelReason === 'string' || attributes.cancelReason === null
            ? attributes.cancelReason
            : undefined,
        tags:
          typeof attributes.tags === 'object' &&
          attributes.tags !== null &&
          !Array.isArray(attributes.tags)
            ? attributes.tags
            : undefined,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined,
        relationships,
        invitation
      };
    });

    return {
      output: {
        invitationIds: invitations.flatMap(invitation =>
          invitation.invitationId ? [invitation.invitationId] : []
        ),
        invitations,
        failedRecipients: meta.failedRecipients,
        meta
      },
      message: `Created **${invitations.length}** customer ${invitations.length === 1 ? 'invitation' : 'invitations'}; **${meta.failedRecipients.length}** ${meta.failedRecipients.length === 1 ? 'recipient' : 'recipients'} failed. Retry only failed recipients to avoid duplicate invitations.`
    };
  })
  .build();

const customerInvitationIdSchema = z
  .string()
  .min(5, 'Customer invitation IDs require a non-empty value after adi_.')
  .startsWith('adi_', 'Customer invitation IDs use the adi_ prefix.');

const revokeCustomerInvitationSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('agentDelegationInvitation'),
        id: customerInvitationIdSchema,
        attributes: z
          .object({
            status: z.string().min(1)
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
        deleted: z.literal(true)
      })
      .passthrough()
  })
  .passthrough();

export const revokeCustomerInvitation = SlateTool.create(spec, {
  name: 'Revoke Customer Invitation',
  key: 'revoke_customer_invitation',
  description:
    'Cancel a pending Natural customer delegation invitation by its adi_* ID. Returns the canceled invitation, its ID and status, and deletion metadata. This endpoint is not documented as idempotent.',
  tags: { destructive: true }
})
  .input(
    z.object({
      invitationId: customerInvitationIdSchema.describe(
        'Natural customer delegation invitation ID. Treat the adi_* value as opaque.'
      ),
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
    requireConfirm(ctx.input.confirm, 'revoke this customer invitation');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke customer invitation',
      'delete',
      `/customers/invitations/${encodeURIComponent(ctx.input.invitationId)}`
    );
    const response = revokeCustomerInvitationSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when revoking a customer invitation. Verify invitation state in Natural before retrying this non-idempotent request.',
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.invitationId) {
      throw naturalServiceError(
        'Natural returned a different customer invitation than the one requested when revoking it. Verify invitation state in Natural before retrying this non-idempotent request.',
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
        deleted: meta.deleted,
        meta
      },
      message: `Revoked customer invitation **${ctx.input.invitationId}**.`
    };
  })
  .build();

const isUriEncodable = (value: string) => {
  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
};

const revokeCustomerAgentCustomerIdSchema = z
  .string()
  .min(5, 'Customer IDs require a non-empty value after pty_.')
  .startsWith('pty_', 'Customer IDs use the pty_ prefix.')
  .refine(isUriEncodable, 'Natural customer ID must be well-formed Unicode.');

const revokeCustomerAgentAgentIdSchema = z
  .string()
  .min(5, 'Agent IDs require a non-empty value after agt_.')
  .startsWith('agt_', 'Agent IDs use the agt_ prefix.')
  .refine(isUriEncodable, 'Natural agent ID must be well-formed Unicode.');

const revokeCustomerAgentSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('customer'),
        id: revokeCustomerAgentCustomerIdSchema,
        attributes: z
          .object({
            name: z.string(),
            email: z.string().nullable(),
            avatarUrl: z.string().url().nullable(),
            createdAt: z.string().datetime({ offset: true }).nullable(),
            delegation: z
              .object({
                id: z.string(),
                status: z.string(),
                permissions: z.array(z.string()),
                createdAt: z.string().datetime({ offset: true })
              })
              .passthrough(),
            agents: z.array(
              z
                .object({
                  id: revokeCustomerAgentAgentIdSchema,
                  name: z.string().nullable(),
                  status: z.string(),
                  permissions: z.array(z.string()),
                  limits: z
                    .object({
                      perTransaction: z.number().int().positive().nullable().optional()
                    })
                    .passthrough()
                    .nullable()
                })
                .passthrough()
            )
          })
          .passthrough()
      })
      .passthrough(),
    meta: z
      .object({
        deleted: z.literal(true)
      })
      .passthrough()
      .optional()
  })
  .passthrough();

export const revokeCustomerAgent = SlateTool.create(spec, {
  name: 'Revoke Customer Agent',
  key: 'revoke_customer_agent',
  description:
    "Remove one Natural agent's access to a customer by pty_* customer ID and agt_* agent ID. This destructive action requires confirmation, sends a bodyless DELETE, and has no documented idempotency key. Returns the customer and agent IDs, current customer delegation status, raw customer resource, and deletion metadata.",
  tags: { destructive: true }
})
  .input(
    z.object({
      customerId: revokeCustomerAgentCustomerIdSchema.describe(
        'Natural customer party ID with a pty_ prefix and non-empty opaque suffix.'
      ),
      agentId: revokeCustomerAgentAgentIdSchema.describe(
        'Natural agent ID with an agt_ prefix and non-empty opaque suffix.'
      ),
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      customerId: z.string().optional().describe('Natural customer party ID.'),
      agentId: z
        .string()
        .optional()
        .describe('Natural agent whose customer access was revoked.'),
      type: z.string().optional(),
      status: z
        .string()
        .optional()
        .describe('Customer delegation status returned after the agent was removed.'),
      customer: rawRecordSchema.describe('Raw Natural customer resource.'),
      deleted: z
        .boolean()
        .describe('Whether Natural returned deletion confirmation metadata.'),
      meta: rawRecordSchema.optional().describe('Raw Natural response metadata.')
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'revoke this customer-agent delegation');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke customer agent',
      'delete',
      `/customers/${encodeURIComponent(ctx.input.customerId)}/agents/${encodeURIComponent(ctx.input.agentId)}`
    );
    const response = revokeCustomerAgentSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when revoking customer-agent access. Verify customer delegation state in Natural before retrying this non-idempotent request.',
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.customerId) {
      throw naturalServiceError(
        'Natural returned a different customer than the one requested when revoking agent access. Verify customer delegation state in Natural before retrying this non-idempotent request.',
        'natural_response_error'
      );
    }

    const { data: customer, meta } = response.data;

    return {
      output: {
        customerId: customer.id,
        agentId: ctx.input.agentId,
        type: customer.type,
        status: customer.attributes.delegation.status,
        customer,
        deleted: meta?.deleted === true,
        meta: meta ?? {}
      },
      message: `Revoked agent **${ctx.input.agentId}** from customer **${ctx.input.customerId}**.`
    };
  })
  .build();
