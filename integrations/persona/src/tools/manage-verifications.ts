import { SlateTool } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let getVerification = SlateTool.create(spec, {
  name: 'Get Verification',
  key: 'get_verification',
  description: `Retrieve the full details and check results of a specific verification. Supports all verification types: Government ID, Selfie, Document, and Database.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      verificationId: z.string().describe('Persona verification ID (starts with ver_)')
    })
  )
  .output(
    z.object({
      verificationId: z.string().describe('Verification ID'),
      verificationType: z
        .string()
        .optional()
        .describe('Verification type (e.g., verification/government-id, verification/selfie)'),
      status: z
        .string()
        .optional()
        .describe(
          'Verification status (created, submitted, passed, failed, requires_retry, canceled)'
        ),
      createdAt: z.string().optional().describe('Creation timestamp'),
      completedAt: z.string().optional().describe('Completion timestamp'),
      checks: z.array(z.any()).optional().describe('Verification check results'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full verification attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.getVerification(ctx.input.verificationId);
    let n = normalizeResource(result.data);

    return {
      output: {
        verificationId: result.data?.id,
        verificationType: result.data?.type,
        status: n.status,
        createdAt: n['created-at'] || n.created_at,
        completedAt: n['completed-at'] || n.completed_at,
        checks: n.checks,
        attributes: n
      },
      message: `Verification **${result.data?.id}** (${result.data?.type}) is **${n.status}**.`
    };
  })
  .build();

export let listVerifications = SlateTool.create(spec, {
  name: 'List Verifications',
  key: 'list_verifications',
  description: `List verifications with optional filters for inquiry ID and status. Supports cursor-based pagination.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      filterInquiryId: z.string().optional().describe('Filter by inquiry ID'),
      filterStatus: z
        .string()
        .optional()
        .describe(
          'Filter by status (created, submitted, passed, failed, requires_retry, canceled)'
        ),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageCursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      verifications: z
        .array(
          z.object({
            verificationId: z.string().describe('Verification ID'),
            verificationType: z.string().optional().describe('Verification type'),
            status: z.string().optional().describe('Status'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of verifications'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.listVerifications({
      filterInquiryId: ctx.input.filterInquiryId,
      filterStatus: ctx.input.filterStatus,
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageCursor
    });

    let verifications = (result.data || []).map((item: any) => {
      let n = normalizeResource(item);
      return {
        verificationId: item.id,
        verificationType: item.type,
        status: n.status,
        createdAt: n['created-at'] || n.created_at
      };
    });

    let nextCursor: string | undefined;
    if (result.links?.next) {
      try {
        let parsed = new URL(result.links.next, 'https://withpersona.com');
        nextCursor = parsed.searchParams.get('page[after]') || undefined;
      } catch {
        /* ignore */
      }
    }

    return {
      output: { verifications, nextCursor },
      message: `Found **${verifications.length}** verifications.`
    };
  })
  .build();

export let redactVerification = SlateTool.create(spec, {
  name: 'Redact Verification',
  key: 'redact_verification',
  description: `Permanently delete all PII from a verification. **This action cannot be undone.** Use for GDPR/CCPA compliance.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      verificationId: z.string().describe('Persona verification ID (starts with ver_)')
    })
  )
  .output(
    z.object({
      verificationId: z.string().describe('Redacted verification ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    await client.redactVerification(ctx.input.verificationId);

    return {
      output: { verificationId: ctx.input.verificationId },
      message: `Redacted verification **${ctx.input.verificationId}**.`
    };
  })
  .build();
