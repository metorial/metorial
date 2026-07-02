import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { segmentServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createRegulation = SlateTool.create(spec, {
  name: 'Create Data Regulation',
  key: 'create_regulation',
  description: `Create a GDPR deletion or suppression request. Submits a regulation to delete or suppress user data across sources or the entire workspace. Can also list existing regulation requests.`,
  instructions: [
    'Use regulationType "SUPPRESS_ONLY" to stop future data collection for a user.',
    'Use regulationType "DELETE_ONLY" to delete existing data.',
    'Use regulationType "SUPPRESS_AND_DELETE" for both.',
    'subjectType is typically "USER_ID".',
    'For source-specific regulation, provide sourceId.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list'])
        .describe('Create a new regulation or list existing ones'),
      regulationType: z
        .string()
        .optional()
        .describe(
          'Type: "SUPPRESS_ONLY", "DELETE_ONLY", or "SUPPRESS_AND_DELETE" (required for create)'
        ),
      subjectType: z
        .string()
        .optional()
        .describe('Subject type, typically "USER_ID" (required for create)'),
      subjectIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to regulate (required for create)'),
      sourceId: z
        .string()
        .optional()
        .describe('Source ID for source-specific regulation (optional)'),
      status: z.string().optional().describe('Filter regulations by status when listing')
    })
  )
  .output(
    z.object({
      regulateId: z.string().optional().describe('ID of the created regulation'),
      regulations: z
        .array(
          z.object({
            regulateId: z.string().describe('Regulation ID'),
            regulationType: z.string().optional().describe('Type'),
            subjectType: z.string().optional().describe('Subject type'),
            status: z.string().optional().describe('Status'),
            createdAt: z.string().optional().describe('Created timestamp')
          })
        )
        .optional()
        .describe('List of regulations (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.action === 'list') {
      let result = await client.listRegulations({ status: ctx.input.status });
      let regulations = (result?.regulations ?? []).map((r: any) => ({
        regulateId: r.id,
        regulationType: r.regulationType,
        subjectType: r.subjectType,
        status: r.status,
        createdAt: r.createdAt
      }));
      return {
        output: { regulations },
        message: `Found **${regulations.length}** regulation requests`
      };
    }

    if (!ctx.input.regulationType || !ctx.input.subjectType || !ctx.input.subjectIds?.length) {
      throw segmentServiceError(
        'regulationType, subjectType, and subjectIds are required to create a regulation'
      );
    }

    let data = {
      regulationType: ctx.input.regulationType,
      subjectType: ctx.input.subjectType,
      subjectIds: ctx.input.subjectIds
    };

    let result: any;
    if (ctx.input.sourceId) {
      result = await client.createSourceRegulation(ctx.input.sourceId, data);
    } else {
      result = await client.createRegulation(data);
    }

    return {
      output: {
        regulateId: result?.regulateId ?? result?.id
      },
      message: `Created **${ctx.input.regulationType}** regulation for ${ctx.input.subjectIds.length} subject(s)`
    };
  })
  .build();
