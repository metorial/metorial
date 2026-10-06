import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { fail, integer } from '../lib/validation';
import { spec } from '../spec';
export let manageCandidateTags = SlateTool.create(spec, {
  name: 'Manage Candidate Tags',
  key: 'manage_candidate_tags',
  description:
    'List company tags, add named tags to a candidate, or remove explicit tag names. Candidate changes are checked by reading the current profile.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['add_to_candidate', 'list_tags', 'remove_from_candidate']),
      candidateId: z.number().optional().describe('Candidate ID for add or remove'),
      tagNames: z
        .array(z.string())
        .optional()
        .describe('Explicit tag names for add or remove; no implicit remove-all'),
      query: z.string().optional().describe('Company tag search for list_tags')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.number().optional(),
            name: z.string(),
            taggingsCount: z.number().optional()
          })
        )
        .optional(),
      added: z.boolean().optional(),
      removed: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action !== 'list_tags') {
      integer(ctx.input.candidateId, 'Candidate ID');
      if (!ctx.input.tagNames?.length || ctx.input.tagNames.some(name => !name.trim()))
        fail('Supply nonempty explicit tag names.');
    }
    const client = await RecruiteeClient.forContext(ctx);
    if (ctx.input.action === 'list_tags') {
      const result = await client.listTags({ query: ctx.input.query });
      return {
        output: {
          tags: result.tags.map(t => ({
            tagId: t.id,
            name: t.name,
            taggingsCount: t.taggings_count
          }))
        },
        message: `Returned ${result.tags.length} company tags.`
      };
    }
    const id = integer(ctx.input.candidateId, 'Candidate ID'),
      tags = ctx.input.tagNames ?? [];
    if (ctx.input.action === 'add_to_candidate') await client.addTagsToCandidate(id, tags);
    else await client.removeTagsFromCandidate(id, tags);
    const actual = (await client.getCandidate(id)).candidate.tags;
    const added = ctx.input.action === 'add_to_candidate';
    if (!tags.every(name => actual.includes(name) === added))
      fail(
        'Candidate tags did not match the requested change. Read the profile before retrying.'
      );
    return {
      output: added ? { added: true } : { removed: true },
      message: `Confirmed tag ${added ? 'addition' : 'removal'} on candidate ${id}.`
    };
  })
  .build();
