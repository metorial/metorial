import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { collection, requiredId } from '../lib/response';
import { spec } from '../spec';

export let listCandidates = SlateTool.create(spec, {
  name: 'List Candidates',
  key: 'list_candidates',
  description: `List candidate records with pagination. Returns a summary of each candidate.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)')
    })
  )
  .output(
    z.object({
      candidates: z
        .array(
          z.object({
            candidateId: z.string().describe('Candidate ID'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            title: z.string().optional().describe('Title'),
            currentEmployer: z.string().optional().describe('Current employer'),
            isActive: z.boolean().optional().describe('Whether active'),
            isHot: z.boolean().optional().describe('Whether hot')
          })
        )
        .describe('Candidate list'),
      totalCount: z.number().optional().describe('Total number of candidates'),
      currentPage: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listCandidates({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let candidates = collection(data, 'candidates').map((c: any) => ({
      candidateId: requiredId(c.id, 'record'),
      firstName: c.first_name ?? undefined,
      lastName: c.last_name ?? undefined,
      title: c.title ?? undefined,
      currentEmployer: c.current_employer ?? undefined,
      isActive: c.is_active ?? undefined,
      isHot: c.is_hot ?? undefined
    }));

    return {
      output: {
        candidates,
        totalCount: data?.total ?? undefined,
        currentPage: data?.page ?? ctx.input.page ?? 1
      },
      message: `Listed **${candidates.length}** candidate(s).`
    };
  })
  .build();
