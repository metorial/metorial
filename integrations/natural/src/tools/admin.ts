import { SlateTool } from 'slates';
import { z } from 'zod';
import { jsonApiBody } from '../lib/envelopes';
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
  deleteOutput,
  listResult,
  metaArray,
  resourceResult,
  summaryListMessage
} from './shared';

const approvalOutputSchema = z.object({
  approvalId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  approval: rawRecordSchema
});

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
        .describe('Approval status filter.')
    })
  )
  .output(
    z.object({
      approvals: rawRecordArraySchema,
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
    const output = listResult(envelope, 'approvals');

    return {
      output,
      message: summaryListMessage(countOf(output, 'approvals'), 'approvals')
    };
  })
  .build();

export const getApproval = SlateTool.create(spec, {
  name: 'Get Approval',
  key: 'get_approval',
  description: 'Retrieve a Natural approval by ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      approvalId: z.string().min(1).describe('Natural approval ID.')
    })
  )
  .output(approvalOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get approval',
      'get',
      `/approvals/${ctx.input.approvalId}`
    );

    return {
      output: resourceResult(envelope, 'approvalId', 'approval'),
      message: `Retrieved approval **${ctx.input.approvalId}**.`
    };
  })
  .build();

export const approveApproval = SlateTool.create(spec, {
  name: 'Approve Approval',
  key: 'approve_approval',
  description:
    'Approve a Natural approval. This can release money movement and requires confirmation.'
})
  .input(
    z.object({
      approvalId: z.string().min(1).describe('Natural approval ID.'),
      confirm: confirmSchema
    })
  )
  .output(approvalOutputSchema)
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'approve this approval');
    const client = createClient(ctx);
    const envelope = await client.request(
      'approve approval',
      'post',
      `/approvals/${ctx.input.approvalId}/approve`
    );

    return {
      output: resourceResult(envelope, 'approvalId', 'approval'),
      message: `Approved approval **${ctx.input.approvalId}**.`
    };
  })
  .build();

export const denyApproval = SlateTool.create(spec, {
  name: 'Deny Approval',
  key: 'deny_approval',
  description:
    'Deny a Natural approval. This can block money movement and requires confirmation.'
})
  .input(
    z.object({
      approvalId: z.string().min(1).describe('Natural approval ID.'),
      confirm: confirmSchema
    })
  )
  .output(approvalOutputSchema)
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'deny this approval');
    const client = createClient(ctx);
    const envelope = await client.request(
      'deny approval',
      'post',
      `/approvals/${ctx.input.approvalId}/deny`
    );

    return {
      output: resourceResult(envelope, 'approvalId', 'approval'),
      message: `Denied approval **${ctx.input.approvalId}**.`
    };
  })
  .build();

export const listPartyInvitations = SlateTool.create(spec, {
  name: 'List Party Invitations',
  key: 'list_party_invitations',
  description:
    'List Natural party invitations with optional party, email, and status filters.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      partyId: z.string().optional().describe('Filter invitations by party ID.'),
      email: z.string().optional().describe('Filter invitations by email.'),
      status: z
        .enum(['PENDING', 'ACCEPTED', 'REVOKED', 'DECLINED'])
        .optional()
        .describe('Invitation status filter.')
    })
  )
  .output(
    z.object({
      invitations: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
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
          status: ctx.input.status
        }
      }
    );
    const output = listResult(envelope, 'invitations');

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
    'Create Natural party member invitations. This endpoint is not documented as idempotent.'
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
        .describe('Party invitations to create.')
    })
  )
  .output(
    z.object({
      invitations: rawRecordArraySchema,
      failed: z.array(z.any())
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
    const invitations = Array.isArray((envelope as any)?.data) ? (envelope as any).data : [];

    return {
      output: {
        invitations,
        failed: metaArray(envelope, 'failed')
      },
      message: `Created **${invitations.length}** party invitations.`
    };
  })
  .build();

export const revokePartyInvitation = SlateTool.create(spec, {
  name: 'Revoke Party Invitation',
  key: 'revoke_party_invitation',
  description: 'Revoke a Natural party invitation.',
  tags: { destructive: true }
})
  .input(
    z.object({
      invitationId: z.string().min(1).describe('Natural party invitation ID.'),
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
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'revoke this party invitation');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'revoke a party invitation');
    const client = createClient(ctx);
    const envelope = await client.request(
      'revoke party invitation',
      'delete',
      `/party-invitations/${ctx.input.invitationId}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );

    return {
      output: deleteOutput(envelope, 'invitationId', 'invitation'),
      message: `Revoked party invitation **${ctx.input.invitationId}**.`
    };
  })
  .build();

export const getParty = SlateTool.create(spec, {
  name: 'Get Party',
  key: 'get_party',
  description: 'Retrieve the authenticated Natural party profile.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      partyId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      party: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('get party', 'get', '/parties/me');

    return {
      output: resourceResult(envelope, 'partyId', 'party'),
      message: 'Retrieved Natural party profile.'
    };
  })
  .build();

export const updateParty = SlateTool.create(spec, {
  name: 'Update Party',
  key: 'update_party',
  description: 'Update the authenticated Natural party profile display name.'
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
      status: z.string().optional(),
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

    return {
      output: resourceResult(envelope, 'partyId', 'party'),
      message: 'Updated Natural party profile.'
    };
  })
  .build();

export const listPartyMembers = SlateTool.create(spec, {
  name: 'List Party Members',
  key: 'list_party_members',
  description: 'List members of the authenticated Natural party.',
  tags: { readOnly: true }
})
  .input(z.object(paginationInputFields))
  .output(
    z.object({
      members: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
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
    const output = listResult(envelope, 'members');

    return {
      output,
      message: summaryListMessage(countOf(output, 'members'), 'party members')
    };
  })
  .build();

export const removePartyMember = SlateTool.create(spec, {
  name: 'Remove Party Member',
  key: 'remove_party_member',
  description: 'Remove a user from the authenticated Natural party.',
  tags: { destructive: true }
})
  .input(
    z.object({
      userId: z.string().min(1).describe('Natural user ID.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      userId: z.string().optional(),
      type: z.string().optional(),
      user: rawRecordSchema,
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'remove this party member');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'remove a party member');
    const client = createClient(ctx);
    const envelope = await client.request(
      'remove party member',
      'delete',
      `/parties/me/members/${ctx.input.userId}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );

    return {
      output: deleteOutput(envelope, 'userId', 'user'),
      message: `Removed party member **${ctx.input.userId}**.`
    };
  })
  .build();
