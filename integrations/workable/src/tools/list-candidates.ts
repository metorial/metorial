import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

let candidateSummarySchema = z.object({
  candidateId: z.string().describe('Candidate ID'),
  name: z.string().describe('Full name'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().optional().describe('Last name'),
  headline: z.string().optional().describe('Candidate headline'),
  email: z.string().optional().describe('Primary email'),
  stage: z.string().optional().describe('Current pipeline stage'),
  disqualified: z.boolean().optional().describe('Whether the candidate is disqualified'),
  sourced: z.boolean().optional().describe('Whether the candidate was sourced'),
  profileUrl: z.string().optional().describe('Workable profile URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listCandidatesTool = SlateTool.create(spec, {
  name: 'List Candidates',
  key: 'list_candidates',
  description: `List candidates across all jobs or filtered by a specific job. Optionally filter by pipeline stage or candidate state. Use this to browse applicants, review pipeline status, or find specific candidates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobShortcode: z.string().optional().describe('Filter by job shortcode'),
      stage: z.string().optional().describe('Filter by pipeline stage slug'),
      state: z.string().optional().describe('Filter by candidate state'),
      limit: z.number().optional().describe('Maximum number of candidates to return'),
      sinceId: z
        .string()
        .optional()
        .describe('Return candidates after this ID for pagination'),
      createdAfter: z
        .string()
        .optional()
        .describe('ISO 8601 date — only return candidates created after this date'),
      updatedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 date — only return candidates updated after this date')
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
      job_shortcode: ctx.input.jobShortcode,
      stage: ctx.input.stage,
      state: ctx.input.state,
      limit: ctx.input.limit,
      since_id: ctx.input.sinceId,
      created_after: ctx.input.createdAfter,
      updated_after: ctx.input.updatedAfter
    });

    let candidates = (result.candidates || []).map((c: any) => ({
      candidateId: c.id,
      name: c.name,
      firstname: c.firstname,
      lastname: c.lastname,
      headline: c.headline,
      email: c.email,
      stage: c.stage,
      disqualified: c.disqualified,
      sourced: c.sourced,
      profileUrl: c.profile_url,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: {
        candidates,
        paging: result.paging
      },
      message: `Found **${candidates.length}** candidate(s)${ctx.input.jobShortcode ? ` for job ${ctx.input.jobShortcode}` : ''}${ctx.input.stage ? ` in stage "${ctx.input.stage}"` : ''}.`
    };
  })
  .build();
