import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { mapCandidateSummary } from '../lib/shapes';
import { spec } from '../spec';

let candidateSummarySchema = z.object({
  candidateId: z.string().describe('Candidate ID'),
  name: z.string().describe('Full name'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().optional().describe('Last name'),
  headline: z.string().optional().describe('Candidate headline'),
  email: z.string().optional().describe('Primary email'),
  stage: z.string().optional().describe('Current pipeline stage'),
  stageKind: z.string().optional().describe('Current pipeline stage kind'),
  jobShortcode: z.string().optional().describe('Associated job shortcode'),
  jobTitle: z.string().optional().describe('Associated job title'),
  disqualified: z.boolean().optional().describe('Whether the candidate is disqualified'),
  withdrew: z.boolean().optional().describe('Whether the candidate withdrew'),
  sourced: z.boolean().optional().describe('Whether the candidate was sourced'),
  profileUrl: z.string().optional().describe('Workable profile URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listCandidatesTool = SlateTool.create(spec, {
  name: 'List Candidates',
  key: 'list_candidates',
  description: `List Workable candidates across jobs or filtered by job shortcode, email, or stage. Use this to find candidate IDs for candidate detail and action tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobShortcode: z.string().optional().describe('Filter by job shortcode'),
      email: z.string().optional().describe('Filter by candidate email'),
      stage: z.string().optional().describe('Filter by pipeline stage slug'),
      limit: z.number().optional().describe('Maximum number of candidates to return'),
      sinceId: z
        .string()
        .optional()
        .describe('Return candidates with ID greater than this ID'),
      maxId: z.string().optional().describe('Return candidates with ID less than this ID'),
      createdAfter: z
        .string()
        .optional()
        .describe('ISO 8601 date; only return candidates created after this date'),
      updatedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 date; only return candidates updated after this date')
    })
  )
  .output(
    z.object({
      candidates: z.array(candidateSummarySchema).describe('List of candidates'),
      paging: z
        .object({
          next: z.string().optional().describe('URL for the next page of results')
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let result = await client.listCandidates({
      shortcode: ctx.input.jobShortcode,
      email: ctx.input.email,
      stage: ctx.input.stage,
      limit: ctx.input.limit,
      since_id: ctx.input.sinceId,
      max_id: ctx.input.maxId,
      created_after: ctx.input.createdAfter,
      updated_after: ctx.input.updatedAfter
    });

    let candidates = (result.candidates || []).map(mapCandidateSummary);

    return {
      output: {
        candidates,
        paging: result.paging
      },
      message: `Found **${candidates.length}** candidate(s)${ctx.input.jobShortcode ? ` for job ${ctx.input.jobShortcode}` : ''}${ctx.input.stage ? ` in stage "${ctx.input.stage}"` : ''}.`
    };
  })
  .build();
