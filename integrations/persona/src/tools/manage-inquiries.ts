import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeListResponse, normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let createInquiry = SlateTool.create(spec, {
  name: 'Create Inquiry',
  key: 'create_inquiry',
  description: `Create a new identity verification inquiry from a template. The inquiry can be pre-populated with user data and later completed by the end-user via hosted flow, embedded flow, or mobile SDK.
Returns the inquiry ID and a session token for embedding the flow.`,
  instructions: [
    'Provide exactly one of inquiryTemplateId, inquiryTemplateVersionId, or templateId (legacy). Call list_inquiry_templates with a production API key to discover template IDs.',
    'Use referenceId to link the inquiry to your internal user ID for deduplication.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      inquiryTemplateId: z
        .string()
        .optional()
        .describe(
          'Inquiry template ID (starts with itmpl_). Discover IDs with list_inquiry_templates using a production API key.'
        ),
      inquiryTemplateVersionId: z
        .string()
        .optional()
        .describe('Published inquiry template version ID (starts with itmplv_)'),
      templateId: z.string().optional().describe('Legacy template ID (starts with tmpl_)'),
      referenceId: z
        .string()
        .optional()
        .describe('Your internal reference ID for linking this inquiry'),
      accountId: z
        .string()
        .optional()
        .describe('Persona account ID to associate with (starts with act_)'),
      note: z.string().optional().describe('Internal note on the inquiry'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Pre-filled fields for the inquiry (e.g., name, address)')
    })
  )
  .output(
    z.object({
      inquiryId: z.string().describe('Persona inquiry ID'),
      status: z.string().optional().describe('Current inquiry status'),
      referenceId: z.string().optional().describe('Your reference ID'),
      sessionToken: z
        .string()
        .optional()
        .describe('Session token for embedding the inquiry flow'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full inquiry attributes')
    })
  )
  .handleInvocation(async ctx => {
    let templates = [
      ctx.input.inquiryTemplateId,
      ctx.input.inquiryTemplateVersionId,
      ctx.input.templateId
    ].filter(value => value !== undefined);
    if (templates.length !== 1 || !templates[0]?.trim()) {
      throw createApiServiceError(
        'Provide exactly one non-empty inquiryTemplateId, inquiryTemplateVersionId, or templateId.'
      );
    }
    let client = new PersonaClient({ token: ctx.auth.token });

    let result = await client.createInquiry({
      inquiryTemplateId: ctx.input.inquiryTemplateId,
      inquiryTemplateVersionId: ctx.input.inquiryTemplateVersionId,
      templateId: ctx.input.templateId,
      referenceId: ctx.input.referenceId,
      accountId: ctx.input.accountId,
      note: ctx.input.note,
      fields: ctx.input.fields
    });

    let normalized = normalizeResource(result.data);
    let sessionToken = result.meta?.['session-token'] || result.meta?.session_token;

    return {
      output: {
        inquiryId: result.data?.id || normalized.resourceId,
        status: normalized.status,
        referenceId: normalized['reference-id'] ?? normalized.reference_id ?? undefined,
        sessionToken,
        attributes: normalized
      },
      message: `Created inquiry **${result.data?.id}** with status **${normalized.status || 'created'}**.`
    };
  })
  .build();

export let getInquiry = SlateTool.create(spec, {
  name: 'Get Inquiry',
  key: 'get_inquiry',
  description: `Retrieve the details of a specific inquiry including its status, verification results, and associated account information.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      inquiryId: z.string().describe('Persona inquiry ID (starts with inq_)')
    })
  )
  .output(
    z.object({
      inquiryId: z.string().describe('Persona inquiry ID'),
      status: z
        .string()
        .optional()
        .describe(
          'Inquiry status (created, pending, completed, approved, declined, expired, failed, needs_review)'
        ),
      referenceId: z.string().optional().describe('Reference ID'),
      accountId: z.string().optional().describe('Associated account ID'),
      templateId: z.string().optional().describe('Template used for this inquiry'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      completedAt: z.string().optional().describe('Completion timestamp'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full inquiry attributes'),
      included: z
        .array(z.any())
        .optional()
        .describe('Related resources (verifications, account, etc.)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.getInquiry(ctx.input.inquiryId);
    let normalized = normalizeResource(result.data);

    return {
      output: {
        inquiryId: result.data?.id,
        status: normalized.status,
        referenceId: normalized['reference-id'] ?? normalized.reference_id ?? undefined,
        accountId: normalized.relationships?.account?.id,
        templateId:
          normalized.relationships?.['inquiry-template']?.id ??
          normalized.relationships?.template?.id,
        createdAt: normalized['created-at'] ?? normalized.created_at ?? undefined,
        completedAt: normalized['completed-at'] ?? normalized.completed_at ?? undefined,
        attributes: normalized,
        included: result.included
      },
      message: `Inquiry **${result.data?.id}** is **${normalized.status}**.`
    };
  })
  .build();

export let listInquiries = SlateTool.create(spec, {
  name: 'List Inquiries',
  key: 'list_inquiries',
  description: `List inquiries with optional filters for status, reference ID, and account. Supports cursor-based pagination.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      filterStatus: z
        .string()
        .optional()
        .describe(
          'Filter by status (created, pending, completed, approved, declined, expired, failed, needs_review)'
        ),
      filterReferenceId: z.string().optional().describe('Filter by your reference ID'),
      filterAccountId: z.string().optional().describe('Filter by Persona account ID'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)'),
      pageCursor: z
        .string()
        .optional()
        .describe('Cursor for pagination (from previous response)')
    })
  )
  .output(
    z.object({
      inquiries: z
        .array(
          z.object({
            inquiryId: z.string().describe('Inquiry ID'),
            status: z.string().optional().describe('Inquiry status'),
            referenceId: z.string().optional().describe('Reference ID'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of inquiries'),
      nextCursor: z.string().optional().describe('Cursor for the next page'),
      previousCursor: z.string().optional().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.listInquiries({
      filterStatus: ctx.input.filterStatus,
      filterReferenceId: ctx.input.filterReferenceId,
      filterAccountId: ctx.input.filterAccountId,
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageCursor
    });

    let inquiries = (result.data || []).map((item: any) => {
      let n = normalizeResource(item);
      return {
        inquiryId: item.id,
        status: n.status,
        referenceId: n['reference-id'] ?? n.reference_id ?? undefined,
        createdAt: n['created-at'] ?? n.created_at ?? undefined
      };
    });

    let { nextCursor, previousCursor } = normalizeListResponse(result);

    return {
      output: { inquiries, nextCursor, previousCursor },
      message: `Found **${inquiries.length}** inquiries.`
    };
  })
  .build();

export let approveInquiry = SlateTool.create(spec, {
  name: 'Approve Inquiry',
  key: 'approve_inquiry',
  description: `Approve a completed inquiry, marking the individual's identity as verified. Optionally include a reviewer comment.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      inquiryId: z.string().describe('Persona inquiry ID (starts with inq_)'),
      comment: z.string().optional().describe('Reviewer comment for the approval')
    })
  )
  .output(
    z.object({
      inquiryId: z.string().describe('Inquiry ID'),
      status: z.string().optional().describe('Updated status'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full inquiry attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.approveInquiry(ctx.input.inquiryId, ctx.input.comment);
    let normalized = normalizeResource(result.data);

    return {
      output: {
        inquiryId: result.data?.id,
        status: normalized.status,
        attributes: normalized
      },
      message: `Approved inquiry **${result.data?.id}**.`
    };
  })
  .build();

export let declineInquiry = SlateTool.create(spec, {
  name: 'Decline Inquiry',
  key: 'decline_inquiry',
  description: `Decline a completed inquiry, marking the individual's identity as not verified. Optionally include a reviewer comment.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      inquiryId: z.string().describe('Persona inquiry ID (starts with inq_)'),
      comment: z.string().optional().describe('Reviewer comment for the decline')
    })
  )
  .output(
    z.object({
      inquiryId: z.string().describe('Inquiry ID'),
      status: z.string().optional().describe('Updated status'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full inquiry attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.declineInquiry(ctx.input.inquiryId, ctx.input.comment);
    let normalized = normalizeResource(result.data);

    return {
      output: {
        inquiryId: result.data?.id,
        status: normalized.status,
        attributes: normalized
      },
      message: `Declined inquiry **${result.data?.id}**.`
    };
  })
  .build();

export let resumeInquiry = SlateTool.create(spec, {
  name: 'Resume Inquiry',
  key: 'resume_inquiry',
  description: `Resume an expired or in-progress inquiry. Returns a new session token that can be used to re-embed the inquiry flow for the end-user.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      inquiryId: z.string().describe('Persona inquiry ID (starts with inq_)')
    })
  )
  .output(
    z.object({
      inquiryId: z.string().describe('Inquiry ID'),
      status: z.string().optional().describe('Updated status'),
      sessionToken: z.string().optional().describe('New session token for embedding'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full inquiry attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.resumeInquiry(ctx.input.inquiryId);
    let normalized = normalizeResource(result.data);
    let sessionToken = result.meta?.['session-token'] || result.meta?.session_token;

    return {
      output: {
        inquiryId: result.data?.id,
        status: normalized.status,
        sessionToken,
        attributes: normalized
      },
      message: `Resumed inquiry **${result.data?.id}**. Status: **${normalized.status}**.`
    };
  })
  .build();

export let generateInquiryLink = SlateTool.create(spec, {
  name: 'Generate Inquiry Link',
  key: 'generate_inquiry_link',
  description: `Generate a one-time link for an inquiry that can be shared with the end-user to complete their verification.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      inquiryId: z.string().describe('Persona inquiry ID (starts with inq_)'),
      expiresIn: z.number().optional().describe('Number of seconds until the link expires')
    })
  )
  .output(
    z.object({
      inquiryId: z.string().describe('Inquiry ID'),
      link: z.string().optional().describe('One-time verification link'),
      attributes: z.record(z.string(), z.any()).optional().describe('Full response meta')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.expiresIn !== undefined &&
      (!Number.isInteger(ctx.input.expiresIn) || ctx.input.expiresIn <= 0)
    ) {
      throw createApiServiceError('expiresIn must be a positive integer number of seconds.');
    }
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.generateInquiryLink(ctx.input.inquiryId, ctx.input.expiresIn);

    let link = result.meta?.['one-time-link'] || result.meta?.one_time_link;

    return {
      output: {
        inquiryId: ctx.input.inquiryId,
        link,
        attributes: result.meta
      },
      message: link
        ? `Generated one-time link for inquiry **${ctx.input.inquiryId}**.`
        : `Generated link response for inquiry **${ctx.input.inquiryId}**.`
    };
  })
  .build();

export let tagInquiry = SlateTool.create(spec, {
  name: 'Tag Inquiry',
  key: 'tag_inquiry',
  description: `Add or remove tags on an inquiry, or replace all tags. Use tags to organize and categorize inquiries.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      inquiryId: z.string().describe('Persona inquiry ID (starts with inq_)'),
      action: z
        .enum(['add', 'remove', 'set'])
        .describe('Tag action: add a tag, remove a tag, or set (replace) all tags'),
      tag: z.string().optional().describe('Tag name (required for add/remove actions)'),
      allTags: z
        .array(z.string())
        .optional()
        .describe('Full list of tags (required for set action, replaces all existing tags)')
    })
  )
  .output(
    z.object({
      inquiryId: z.string().describe('Inquiry ID'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated inquiry attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.action === 'add' && ctx.input.tag) {
      result = await client.addInquiryTag(ctx.input.inquiryId, ctx.input.tag);
    } else if (ctx.input.action === 'remove' && ctx.input.tag) {
      result = await client.removeInquiryTag(ctx.input.inquiryId, ctx.input.tag);
    } else if (ctx.input.action === 'set' && ctx.input.allTags) {
      result = await client.setInquiryTags(ctx.input.inquiryId, ctx.input.allTags);
    } else {
      throw createApiServiceError('Provide tag for add/remove, or allTags for set.');
    }

    let normalized = normalizeResource(result.data);
    return {
      output: {
        inquiryId: result.data?.id || ctx.input.inquiryId,
        attributes: normalized
      },
      message: `${ctx.input.action === 'add' ? 'Added' : ctx.input.action === 'remove' ? 'Removed' : 'Set'} tag(s) on inquiry **${ctx.input.inquiryId}**.`
    };
  })
  .build();

export let redactInquiry = SlateTool.create(spec, {
  name: 'Redact Inquiry',
  key: 'redact_inquiry',
  description: `Permanently delete all PII associated with an inquiry. **This action cannot be undone.** Use for GDPR/CCPA compliance.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      inquiryId: z.string().describe('Persona inquiry ID (starts with inq_)')
    })
  )
  .output(
    z.object({
      inquiryId: z.string().describe('Redacted inquiry ID'),
      status: z.string().optional().describe('Updated status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.redactInquiry(ctx.input.inquiryId);
    let normalized = normalizeResource(result.data);

    return {
      output: {
        inquiryId: result.data?.id || ctx.input.inquiryId,
        status: normalized.status
      },
      message: `Redacted inquiry **${ctx.input.inquiryId}**. All PII has been permanently deleted.`
    };
  })
  .build();
