import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdentityCheckClient } from '../lib/client';
import { spec } from '../spec';

export let listVerifications = SlateTool.create(spec, {
  name: 'List Verifications',
  key: 'list_verifications',
  description: `Lists identity verification requests with optional filtering by status and date range. Returns a paginated list of verifications and their current statuses. Useful for monitoring verification pipelines and auditing completed checks.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      limit: z.number().optional().describe('Number of results per page'),
      status: z
        .enum(['pending', 'completed', 'expired', 'cancelled'])
        .optional()
        .describe('Filter by verification status'),
      fromDate: z
        .string()
        .optional()
        .describe('Filter verifications created on or after this date (ISO 8601 format)'),
      toDate: z
        .string()
        .optional()
        .describe('Filter verifications created on or before this date (ISO 8601 format)')
    })
  )
  .output(
    z.object({
      verifications: z
        .array(
          z.object({
            verificationId: z.string().describe('Unique ID of the verification'),
            status: z.string().describe('Current status of the verification'),
            outcome: z.string().optional().describe('Verification outcome if completed'),
            email: z.string().optional().describe('Email address of the individual'),
            verificationType: z.string().optional().describe('Type of verification'),
            referenceId: z.string().optional().describe('Your reference ID if provided'),
            createdAt: z
              .string()
              .optional()
              .describe('Timestamp when verification was created'),
            completedAt: z
              .string()
              .optional()
              .describe('Timestamp when verification was completed')
          })
        )
        .describe('List of verification records'),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of verifications matching the filter'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdentityCheckClient(ctx.auth.token);

    let result = await client.listVerifications({
      page: ctx.input.page,
      limit: ctx.input.limit,
      status: ctx.input.status,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate
    });

    let items = result.data || result.verifications || result.items || [];
    let verifications = items.map((v: any) => ({
      verificationId: v.id || v.verification_id,
      status: v.status,
      outcome: v.outcome || v.result,
      email: v.email,
      verificationType: v.verification_type,
      referenceId: v.reference_id,
      createdAt: v.created_at,
      completedAt: v.completed_at
    }));

    return {
      output: {
        verifications,
        totalCount: result.total_count || result.total,
        currentPage: result.page || result.current_page,
        totalPages: result.total_pages
      },
      message: `Found **${verifications.length}** verification(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
