import { SlateTool } from 'slates';
import { z } from 'zod';
import { attributesOf, idOf, isRecord, jsonApiBody, listData } from '../lib/envelopes';
import { naturalServiceError } from '../lib/errors';
import { paginationInputFields } from '../lib/pagination';
import {
  ensureAtLeastOneField,
  requireConfirm,
  requireIdempotencyKey
} from '../lib/validation';
import { spec } from '../spec';
import {
  confirmSchema,
  idempotencyKeySchema,
  rawRecordArraySchema,
  rawRecordSchema
} from './schemas';
import {
  attributesBody,
  countOf,
  createClient,
  listResult,
  resourceResult,
  summaryListMessage
} from './shared';

const approvalOutputSchema = z.object({
  approvalId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  approval: rawRecordSchema
});

const failedPartyInvitationSchema = z
  .object({
    email: z.string(),
    error: z.string()
  })
  .passthrough();

const createPartyInvitationsSuccessSchema = z
  .object({
    data: z.array(
      z
        .object({
          type: z.literal('invitation'),
          id: z.string().regex(/^inv_[0-9a-f]{32}$/),
          attributes: rawRecordSchema
        })
        .passthrough()
    ),
    meta: z
      .object({
        failed: z.array(failedPartyInvitationSchema)
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

const partyInvitationIdSchema = z
  .string()
  .min(5, 'Party invitation IDs require a non-empty value after inv_.')
  .startsWith('inv_', 'Party invitation IDs use the inv_ prefix.')
  .refine(isUriEncodable, 'Natural party invitation ID must be well-formed Unicode.');

const partyMemberUserIdSchema = z
  .string()
  .min(5, 'User IDs require a non-empty value after usr_.')
  .startsWith('usr_', 'User IDs use the usr_ prefix.')
  .refine(isUriEncodable, 'Natural user ID must be well-formed Unicode.');

const removePartyMemberSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('user'),
        id: partyMemberUserIdSchema
      })
      .passthrough(),
    meta: z
      .object({
        deleted: z.literal(true)
      })
      .passthrough()
  })
  .passthrough();

const revokePartyInvitationSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('invitation'),
        id: partyInvitationIdSchema,
        attributes: z
          .object({
            email: z.string(),
            role: z.string().min(1),
            status: z.literal('REVOKED'),
            expiresAt: z.string(),
            createdAt: z.string(),
            acceptedAt: z.string().nullable()
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

const getPartySuccessSchema = z
  .object({
    data: z
      .object({
        id: z.string().min(1),
        type: z.literal('party'),
        attributes: rawRecordSchema
      })
      .passthrough()
  })
  .passthrough();

export const listApprovals = SlateTool.create(spec, {
  name: 'List Approvals',
  key: 'list_approvals',
  description: 'List Natural approvals for payment, deposit, or withdrawal decisions.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe('Maximum approvals to return.'),
      status: z
        .enum(['pending', 'approved', 'denied', 'canceled'])
        .optional()
        .describe('Approval status filter. Natural defaults to pending when omitted.')
    })
  )
  .output(
    z.object({
      approvals: z.array(
        z.object({
          id: z.string().optional(),
          approvalId: z.string().optional(),
          type: z.string().optional(),
          status: z.string().optional(),
          targetType: z.string().optional(),
          targetId: z.string().optional(),
          reasons: rawRecordArraySchema.optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          resolvedAt: z.string().nullable().optional(),
          approval: rawRecordSchema
        })
      ),
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list approvals', 'get', '/approvals', {
      params: {
        limit: ctx.input.limit,
        status: ctx.input.status
      }
    });
    const listOutput = listResult(envelope, 'approvals');
    const approvals = listData(envelope).map((approval, index) => {
      const attributes = attributesOf(approval);
      const target = isRecord(attributes.target) ? attributes.target : {};

      return {
        ...listOutput.approvals[index],
        approvalId: idOf(approval),
        targetType: typeof target.type === 'string' ? target.type : undefined,
        targetId: typeof target.id === 'string' ? target.id : undefined,
        reasons: Array.isArray(attributes.reasons)
          ? attributes.reasons.filter(isRecord)
          : undefined,
        resolvedAt:
          typeof attributes.resolvedAt === 'string' || attributes.resolvedAt === null
            ? attributes.resolvedAt
            : undefined,
        approval
      };
    });
    const output = {
      ...listOutput,
      approvals
    };

    return {
      output,
      message: summaryListMessage(countOf(output, 'approvals'), 'approvals')
    };
  })
  .build();

export const getApproval = SlateTool.create(spec, {
  name: 'Get Approval',
  key: 'get_approval',
  description:
    'Retrieve a Natural approval by ID, including its status, target, reasons, and resolution timestamps.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      approvalId: z
        .string()
        .regex(/^apr_[0-9a-f]{32}$/)
        .describe(
          'Natural approval ID (apr_ followed by 32 lowercase hexadecimal characters).'
        )
    })
  )
  .output(
    z.object({
      approvalId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      targetType: z.string().optional(),
      targetId: z.string().optional(),
      reasons: rawRecordArraySchema.optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      resolvedAt: z.string().nullable().optional(),
      approval: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get approval',
      'get',
      `/approvals/${ctx.input.approvalId}`
    );
    const result = resourceResult(envelope, 'approvalId', 'approval');
    const attributes = attributesOf(result.approval);
    const target = isRecord(attributes.target) ? attributes.target : {};

    return {
      output: {
        ...result,
        targetType: typeof target.type === 'string' ? target.type : undefined,
        targetId: typeof target.id === 'string' ? target.id : undefined,
        reasons: Array.isArray(attributes.reasons)
          ? attributes.reasons.filter(isRecord)
          : undefined,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined,
        resolvedAt:
          typeof attributes.resolvedAt === 'string' || attributes.resolvedAt === null
            ? attributes.resolvedAt
            : undefined
      },
      message: `Retrieved approval **${ctx.input.approvalId}**.`
    };
  })
  .build();

export const approveApproval = SlateTool.create(spec, {
  name: 'Approve Approval',
  key: 'approve_approval',
  description:
    'Approve a Natural payment or transfer under review. This can release money movement, is not documented as idempotent, and requires confirmation.',
  tags: { destructive: true }
})
  .input(
    z.object({
      approvalId: z
        .string()
        .regex(/^apr_[0-9a-f]{32}$/)
        .describe(
          'Natural approval ID (apr_ followed by 32 lowercase hexadecimal characters).'
        ),
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      approvalId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      targetType: z.string().optional(),
      targetId: z.string().optional(),
      reasons: rawRecordArraySchema.optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      resolvedAt: z.string().nullable().optional(),
      approval: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'approve this approval');
    const client = createClient(ctx);
    const envelope = await client.request(
      'approve approval',
      'post',
      `/approvals/${ctx.input.approvalId}/approve`
    );
    const result = resourceResult(envelope, 'approvalId', 'approval');
    const attributes = attributesOf(result.approval);
    const target = isRecord(attributes.target) ? attributes.target : {};

    return {
      output: {
        ...result,
        targetType: typeof target.type === 'string' ? target.type : undefined,
        targetId: typeof target.id === 'string' ? target.id : undefined,
        reasons: Array.isArray(attributes.reasons)
          ? attributes.reasons.filter(isRecord)
          : undefined,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined,
        resolvedAt:
          typeof attributes.resolvedAt === 'string' || attributes.resolvedAt === null
            ? attributes.resolvedAt
            : undefined
      },
      message: `Approved approval **${ctx.input.approvalId}**.`
    };
  })
  .build();

export const denyApproval = SlateTool.create(spec, {
  name: 'Deny Approval',
  key: 'deny_approval',
  description:
    'Deny a Natural payment or transfer under review. This blocks money movement, is not documented as idempotent, and requires confirmation.',
  tags: { destructive: true }
})
  .input(
    z.object({
      approvalId: z
        .string()
        .regex(/^apr_[0-9a-f]{32}$/)
        .describe(
          'Natural approval ID (apr_ followed by 32 lowercase hexadecimal characters).'
        ),
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      approvalId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      targetType: z.string().optional(),
      targetId: z.string().optional(),
      reasons: rawRecordArraySchema.optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      resolvedAt: z.string().nullable().optional(),
      approval: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'deny this approval');
    const client = createClient(ctx);
    const envelope = await client.request(
      'deny approval',
      'post',
      `/approvals/${ctx.input.approvalId}/deny`
    );
    const result = resourceResult(envelope, 'approvalId', 'approval');
    const attributes = attributesOf(result.approval);
    const target = isRecord(attributes.target) ? attributes.target : {};

    return {
      output: {
        ...result,
        targetType: typeof target.type === 'string' ? target.type : undefined,
        targetId: typeof target.id === 'string' ? target.id : undefined,
        reasons: Array.isArray(attributes.reasons)
          ? attributes.reasons.filter(isRecord)
          : undefined,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined,
        resolvedAt:
          typeof attributes.resolvedAt === 'string' || attributes.resolvedAt === null
            ? attributes.resolvedAt
            : undefined
      },
      message: `Denied approval **${ctx.input.approvalId}**.`
    };
  })
  .build();

export const listPartyInvitations = SlateTool.create(spec, {
  name: 'List Party Invitations',
  key: 'list_party_invitations',
  description:
    'List Natural invitations to join the authenticated party, with optional party, recipient email, status, and cursor pagination filters. Returns actionable invitation IDs, roles, lifecycle timestamps, pagination metadata, and raw invitation resources.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...paginationInputFields,
      partyId: z.string().min(1).optional().describe('Filter by your own Natural party ID.'),
      email: z.string().optional().describe('Filter by recipient email address.'),
      status: z
        .enum(['PENDING', 'ACCEPTED', 'REVOKED', 'DECLINED'])
        .optional()
        .describe('Invitation status filter.')
    })
  )
  .output(
    z.object({
      invitations: z.array(
        z.object({
          id: z.string().optional(),
          invitationId: z.string().optional(),
          type: z.string().optional(),
          email: z.string().optional(),
          recipientEmail: z.string().optional(),
          role: z.string().optional(),
          status: z.string().optional(),
          expiresAt: z.string().optional(),
          createdAt: z.string().optional(),
          acceptedAt: z.string().nullable().optional(),
          attributes: rawRecordSchema.optional(),
          relationships: rawRecordSchema.optional(),
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
      'list party invitations',
      'get',
      '/party-invitations',
      {
        params: {
          partyId: ctx.input.partyId,
          email: ctx.input.email,
          status: ctx.input.status,
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        }
      }
    );
    const listOutput = listResult(envelope, 'invitations');
    const invitations = listData(envelope).map((invitation, index) => {
      const attributes = attributesOf(invitation);
      const relationships = isRecord(invitation.relationships)
        ? invitation.relationships
        : undefined;
      const email = typeof attributes.email === 'string' ? attributes.email : undefined;

      return {
        ...listOutput.invitations[index],
        invitationId: idOf(invitation),
        email,
        recipientEmail: email,
        role: typeof attributes.role === 'string' ? attributes.role : undefined,
        expiresAt: typeof attributes.expiresAt === 'string' ? attributes.expiresAt : undefined,
        acceptedAt:
          typeof attributes.acceptedAt === 'string' || attributes.acceptedAt === null
            ? attributes.acceptedAt
            : undefined,
        attributes,
        relationships,
        invitation
      };
    });
    const meta = isRecord(envelope) && isRecord(envelope.meta) ? envelope.meta : {};
    const output = {
      ...listOutput,
      invitations,
      meta
    };

    return {
      output,
      message: summaryListMessage(countOf(output, 'invitations'), 'party invitations')
    };
  })
  .build();

export const createPartyInvitations = SlateTool.create(spec, {
  name: 'Create Party Invitations',
  key: 'create_party_invitations',
  description:
    'Create 1-100 Natural party invitations for email recipients with ADMIN, MEMBER, or VIEWER access. Returns actionable invitation IDs, lifecycle fields, raw resources, and per-recipient failures. This endpoint is not documented as idempotent.',
  constraints: [
    'Natural accepts email recipients only for party invitations.',
    'The endpoint does not accept custom expiration or metadata tags; Natural controls invitation expiration.',
    'A batch can partially succeed. Inspect failed results before retrying because retries are not documented as idempotent.'
  ]
})
  .input(
    z.object({
      invitations: z
        .array(
          z.object({
            email: z.string().email().describe('Email address to invite.'),
            role: z
              .enum(['ADMIN', 'MEMBER', 'VIEWER'])
              .describe('Role to assign on acceptance.')
          })
        )
        .min(1)
        .max(100)
        .describe('Email invitations to create in one batch (1-100).')
    })
  )
  .output(
    z.object({
      invitationIds: z.array(z.string()),
      invitations: z.array(
        z.object({
          invitationId: z.string().optional(),
          type: z.string().optional(),
          status: z.string().optional(),
          recipient: z.object({
            email: z.string().optional()
          }),
          role: z.string().optional(),
          expiresAt: z.string().optional(),
          createdAt: z.string().optional(),
          acceptedAt: z.string().nullable().optional(),
          relationships: rawRecordSchema.optional(),
          invitation: rawRecordSchema
        })
      ),
      failed: z.array(failedPartyInvitationSchema),
      meta: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'create party invitations',
      'post',
      '/party-invitations',
      {
        body: jsonApiBody({
          invitations: ctx.input.invitations
        })
      }
    );
    const response = createPartyInvitationsSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when creating party invitations. Verify invitation state in Natural before retrying this non-idempotent request.',
        'natural_response_error'
      );
    }

    const { data: rawInvitations, meta } = response.data;
    const invitations = rawInvitations.map(invitation => {
      const attributes = attributesOf(invitation);
      const relationships = isRecord(invitation.relationships)
        ? invitation.relationships
        : undefined;

      return {
        invitationId: idOf(invitation),
        type: typeof invitation.type === 'string' ? invitation.type : undefined,
        status: typeof attributes.status === 'string' ? attributes.status : undefined,
        recipient: {
          email: typeof attributes.email === 'string' ? attributes.email : undefined
        },
        role: typeof attributes.role === 'string' ? attributes.role : undefined,
        expiresAt: typeof attributes.expiresAt === 'string' ? attributes.expiresAt : undefined,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        acceptedAt:
          typeof attributes.acceptedAt === 'string' || attributes.acceptedAt === null
            ? attributes.acceptedAt
            : undefined,
        relationships,
        invitation
      };
    });
    const failed = meta.failed;

    return {
      output: {
        invitationIds: invitations.flatMap(invitation =>
          invitation.invitationId ? [invitation.invitationId] : []
        ),
        invitations,
        failed,
        meta
      },
      message: `Created **${invitations.length}** party invitations; **${failed.length}** failed.`
    };
  })
  .build();

export const revokePartyInvitation = SlateTool.create(spec, {
  name: 'Revoke Party Invitation',
  key: 'revoke_party_invitation',
  description:
    'Revoke a pending Natural party invitation by ID. This destructive operation requires confirmation and an idempotency key; reuse the same key when retrying the same revocation.',
  tags: { destructive: true }
})
  .input(
    z.object({
      invitationId: partyInvitationIdSchema.describe(
        'Natural party invitation ID with an inv_ prefix and non-empty opaque suffix.'
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
    requireConfirm(ctx.input.confirm, 'revoke this party invitation');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'revoke a party invitation');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke party invitation',
      'delete',
      `/party-invitations/${encodeURIComponent(ctx.input.invitationId)}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );
    const response = revokePartyInvitationSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when revoking a party invitation. Verify invitation state in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.invitationId) {
      throw naturalServiceError(
        'Natural returned a different party invitation than the one requested when revoking it. Verify invitation state in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
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
      message: `Revoked party invitation **${ctx.input.invitationId}**.`
    };
  })
  .build();

export const getParty = SlateTool.create(spec, {
  name: 'Get Party',
  key: 'get_party',
  description:
    "Retrieve the authenticated caller's Natural party identity, including names, status, contact details, address, lifecycle timestamps, relationships, and raw metadata.",
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      partyId: z.string().optional(),
      type: z.string().optional(),
      partyType: z.string().optional(),
      legalName: z.string().nullable().optional(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      displayName: z.string().nullable().optional(),
      handle: z.string().nullable().optional(),
      avatarUrl: z.string().nullable().optional(),
      persona: z.string().nullable().optional(),
      status: z.string().optional(),
      email: z.string().nullable().optional(),
      primaryEmail: z.string().nullable().optional(),
      primaryPhone: z.string().nullable().optional(),
      addressLine1: z.string().nullable().optional(),
      addressCity: z.string().nullable().optional(),
      addressState: z.string().nullable().optional(),
      addressPostalCode: z.string().nullable().optional(),
      addressCountry: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      createdBy: z.string().nullable().optional(),
      attributes: rawRecordSchema,
      relationships: rawRecordSchema.optional(),
      meta: rawRecordSchema,
      party: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('get party', 'get', '/parties/me');
    const response = getPartySuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when retrieving the party profile. This is a read-only request, so it is safe to retry.',
        'natural_response_error'
      );
    }

    const result = resourceResult(response.data, 'partyId', 'party');
    const attributes = attributesOf(result.party);
    const relationships = isRecord(result.party.relationships)
      ? result.party.relationships
      : undefined;
    const meta = isRecord(response.data.meta) ? response.data.meta : {};
    const nullableString = (value: unknown) =>
      typeof value === 'string' || value === null ? value : undefined;
    const email = nullableString(attributes.email);
    const primaryEmail = nullableString(attributes.primaryEmail);

    return {
      output: {
        ...result,
        partyType: typeof attributes.partyType === 'string' ? attributes.partyType : undefined,
        legalName: nullableString(attributes.legalName),
        firstName: nullableString(attributes.firstName),
        lastName: nullableString(attributes.lastName),
        displayName: nullableString(attributes.displayName),
        handle: nullableString(attributes.handle),
        avatarUrl: nullableString(attributes.avatarUrl),
        persona: nullableString(attributes.persona),
        email: email === undefined ? primaryEmail : email,
        primaryEmail: primaryEmail === undefined ? email : primaryEmail,
        primaryPhone: nullableString(attributes.primaryPhone),
        addressLine1: nullableString(attributes.addressLine1),
        addressCity: nullableString(attributes.addressCity),
        addressState: nullableString(attributes.addressState),
        addressPostalCode: nullableString(attributes.addressPostalCode),
        addressCountry: nullableString(attributes.addressCountry),
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined,
        createdBy: nullableString(attributes.createdBy),
        attributes,
        relationships,
        meta
      },
      message: 'Retrieved Natural party profile.'
    };
  })
  .build();

export const updateParty = SlateTool.create(spec, {
  name: 'Update Party',
  key: 'update_party',
  description:
    "Update the authenticated Natural party's display name, or clear it with null. Returns the updated identity, status, contact details, address, lifecycle timestamps, relationships, and raw metadata."
})
  .input(
    z.object({
      displayName: z
        .string()
        .min(1)
        .nullable()
        .optional()
        .describe('Updated display name, or null to clear it.')
    })
  )
  .output(
    z.object({
      partyId: z.string().optional(),
      type: z.string().optional(),
      partyType: z.string().optional(),
      legalName: z.string().nullable().optional(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      displayName: z.string().nullable().optional(),
      handle: z.string().nullable().optional(),
      avatarUrl: z.string().nullable().optional(),
      persona: z.string().nullable().optional(),
      status: z.string().optional(),
      email: z.string().nullable().optional(),
      primaryEmail: z.string().nullable().optional(),
      primaryPhone: z.string().nullable().optional(),
      addressLine1: z.string().nullable().optional(),
      addressCity: z.string().nullable().optional(),
      addressState: z.string().nullable().optional(),
      addressPostalCode: z.string().nullable().optional(),
      addressCountry: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      createdBy: z.string().nullable().optional(),
      attributes: rawRecordSchema,
      relationships: rawRecordSchema.optional(),
      meta: rawRecordSchema,
      party: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const body = attributesBody({
      displayName: ctx.input.displayName
    });
    ensureAtLeastOneField(body, 'party update');

    const client = createClient(ctx);
    const envelope = await client.request('update party', 'patch', '/parties/me', {
      body: jsonApiBody(body)
    });
    const response = getPartySuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when updating the party profile. Verify the party profile state in Natural before retrying this non-idempotent request.',
        'natural_response_error'
      );
    }

    const result = resourceResult(response.data, 'partyId', 'party');
    const attributes = attributesOf(result.party);
    const relationships = isRecord(result.party.relationships)
      ? result.party.relationships
      : undefined;
    const meta = isRecord(response.data.meta) ? response.data.meta : {};
    const nullableString = (value: unknown) =>
      typeof value === 'string' || value === null ? value : undefined;
    const email = nullableString(attributes.email);
    const primaryEmail = nullableString(attributes.primaryEmail);

    return {
      output: {
        ...result,
        partyType: typeof attributes.partyType === 'string' ? attributes.partyType : undefined,
        legalName: nullableString(attributes.legalName),
        firstName: nullableString(attributes.firstName),
        lastName: nullableString(attributes.lastName),
        displayName: nullableString(attributes.displayName),
        handle: nullableString(attributes.handle),
        avatarUrl: nullableString(attributes.avatarUrl),
        persona: nullableString(attributes.persona),
        email: email === undefined ? primaryEmail : email,
        primaryEmail: primaryEmail === undefined ? email : primaryEmail,
        primaryPhone: nullableString(attributes.primaryPhone),
        addressLine1: nullableString(attributes.addressLine1),
        addressCity: nullableString(attributes.addressCity),
        addressState: nullableString(attributes.addressState),
        addressPostalCode: nullableString(attributes.addressPostalCode),
        addressCountry: nullableString(attributes.addressCountry),
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined,
        createdBy: nullableString(attributes.createdBy),
        attributes,
        relationships,
        meta
      },
      message: 'Updated Natural party profile.'
    };
  })
  .build();

export const listPartyMembers = SlateTool.create(spec, {
  name: 'List Party Members',
  key: 'list_party_members',
  description:
    'List active members of the authenticated Natural party with cursor pagination. Returns Natural user IDs, names, email addresses, roles, statuses, lifecycle timestamps, raw member resources, and response metadata.',
  tags: { readOnly: true }
})
  .input(z.object(paginationInputFields))
  .output(
    z.object({
      members: z.array(
        z.object({
          id: z.string().optional(),
          userId: z.string().optional(),
          type: z.string().optional(),
          partyId: z.string().optional(),
          name: z.string().nullable().optional(),
          firstName: z.string().nullable().optional(),
          lastName: z.string().nullable().optional(),
          email: z.string().nullable().optional(),
          role: z.string().optional(),
          status: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          attributes: rawRecordSchema,
          relationships: rawRecordSchema.optional(),
          member: rawRecordSchema
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
    const envelope = await client.request('list party members', 'get', '/parties/me/members', {
      params: {
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      }
    });
    const listOutput = listResult(envelope, 'members');
    const members = listData(envelope).map(member => {
      const attributes = attributesOf(member);
      const relationships = isRecord(member.relationships) ? member.relationships : undefined;
      const nullableString = (value: unknown) =>
        typeof value === 'string' || value === null ? value : undefined;
      const firstName = nullableString(attributes.firstName);
      const lastName = nullableString(attributes.lastName);
      const userName = nullableString(attributes.userName);
      const email = nullableString(attributes.email);
      const userEmail = nullableString(attributes.userEmail);
      const combinedName = [firstName, lastName]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(' ');
      const userId = idOf(member);

      return {
        id: userId,
        userId,
        type: typeof member.type === 'string' ? member.type : undefined,
        partyId: typeof attributes.partyId === 'string' ? attributes.partyId : undefined,
        name:
          userName !== undefined
            ? userName
            : combinedName.length > 0
              ? combinedName
              : firstName === null && lastName === null
                ? null
                : undefined,
        firstName,
        lastName,
        email: email === undefined ? userEmail : email,
        role: typeof attributes.role === 'string' ? attributes.role : undefined,
        status: typeof attributes.status === 'string' ? attributes.status : undefined,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined,
        attributes,
        relationships,
        member
      };
    });
    const meta = isRecord(envelope) && isRecord(envelope.meta) ? envelope.meta : {};
    const output = {
      ...listOutput,
      members,
      meta
    };

    return {
      output,
      message: summaryListMessage(countOf(output, 'members'), 'party members')
    };
  })
  .build();

export const removePartyMember = SlateTool.create(spec, {
  name: 'Remove Party Member',
  key: 'remove_party_member',
  description:
    'Remove a member from the authenticated Natural party by user ID. This destructive operation requires confirmation and an idempotency key; reuse the same key when retrying the same removal.',
  tags: { destructive: true }
})
  .input(
    z.object({
      userId: partyMemberUserIdSchema.describe(
        'Natural user ID with a usr_ prefix and non-empty opaque suffix.'
      ),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      userId: z.string().min(1).describe('Removed Natural user ID.'),
      type: z.literal('user').describe('Natural resource type.'),
      user: rawRecordSchema.describe('Raw Natural removed-member resource.'),
      deleted: z.literal(true).describe('Natural confirmed the membership was deleted.'),
      meta: rawRecordSchema.describe(
        'Raw Natural response metadata, including deletion confirmation and additive metadata.'
      )
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'remove this party member');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'remove a party member');
    const client = createClient(ctx);
    const envelope = await client.request(
      'remove party member',
      'delete',
      `/parties/me/members/${encodeURIComponent(ctx.input.userId)}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );
    const response = removePartyMemberSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when removing a party member. Verify party membership state in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.userId) {
      throw naturalServiceError(
        'Natural returned a different party member than the one requested when removing it. Verify party membership state in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }

    const { data: user, meta } = response.data;

    return {
      output: {
        userId: user.id,
        type: user.type,
        user,
        deleted: meta.deleted,
        meta
      },
      message: `Removed party member **${ctx.input.userId}**.`
    };
  })
  .build();
