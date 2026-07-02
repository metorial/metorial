import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTerms = SlateTool.create(spec, {
  name: 'List Terms',
  key: 'list_terms',
  description: `List academic terms configured in Blackboard Learn. Terms represent semesters, quarters, or other time periods used to organize courses.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Number of items to skip'),
      limit: z.number().optional().describe('Maximum results to return')
    })
  )
  .output(
    z.object({
      terms: z.array(
        z.object({
          termId: z.string().describe('Term ID'),
          name: z.string().describe('Term name'),
          description: z.string().optional().describe('Term description'),
          externalId: z.string().optional().describe('External identifier'),
          available: z.string().optional().describe('Availability status'),
          startDate: z.string().optional().describe('Term start date'),
          endDate: z.string().optional().describe('Term end date')
        })
      ),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let result = await client.listTerms({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let terms = (result.results || []).map(t => ({
      termId: t.id,
      name: t.name,
      description: t.description,
      externalId: t.externalId,
      available: t.availability?.available,
      startDate: t.availability?.duration?.start,
      endDate: t.availability?.duration?.end
    }));

    return {
      output: { terms, hasMore: !!result.paging?.nextPage },
      message: `Found **${terms.length}** term(s).`
    };
  })
  .build();
