import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapCandidate } from '../lib/mappers';
import { spec } from '../spec';

export let listCandidatesTool = SlateTool.create(spec, {
  name: 'List Candidates',
  key: 'list_candidates',
  description: `List and search candidates in Greenhouse. Supports filtering by email, date ranges, and associated job. Returns paginated results.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 500, default 50)'),
      email: z.string().optional().describe('Filter candidates by email address'),
      jobId: z.string().optional().describe('Filter candidates associated with this job'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only return candidates created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only return candidates created before this ISO 8601 timestamp'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return candidates updated after this ISO 8601 timestamp'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Only return candidates updated before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      candidates: z.array(
        z.object({
          candidateId: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          company: z.string().nullable(),
          title: z.string().nullable(),
          emailAddresses: z.array(z.object({ value: z.string(), type: z.string() })),
          phoneNumbers: z.array(z.object({ value: z.string(), type: z.string() })),
          tags: z.array(z.string()),
          applicationIds: z.array(z.string()),
          createdAt: z.string().nullable(),
          updatedAt: z.string().nullable()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let perPage = ctx.input.perPage || 50;

    let results = await client.listCandidates({
      page: ctx.input.page,
      perPage,
      email: ctx.input.email,
      jobId: ctx.input.jobId ? Number.parseInt(ctx.input.jobId, 10) : undefined,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      updatedAfter: ctx.input.updatedAfter,
      updatedBefore: ctx.input.updatedBefore
    });

    let candidates = results.map(mapCandidate);

    return {
      output: {
        candidates,
        hasMore: results.length >= perPage
      },
      message: `Found ${candidates.length} candidate(s)${ctx.input.email ? ` matching email "${ctx.input.email}"` : ''}.${candidates.length >= perPage ? ' More results may be available on the next page.' : ''}`
    };
  })
  .build();
