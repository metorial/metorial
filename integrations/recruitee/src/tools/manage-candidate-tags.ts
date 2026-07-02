import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let manageCandidateTags = SlateTool.create(spec, {
  name: 'Manage Candidate Tags',
  key: 'manage_candidate_tags',
  description: `Add tags to a candidate or list all available tags in the company account. Tags help organize and categorize candidates for easier filtering and searching.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add_to_candidate', 'list_tags'])
        .describe(
          '"add_to_candidate" to add tags to a candidate, or "list_tags" to list all available tags'
        ),
      candidateId: z
        .number()
        .optional()
        .describe('ID of the candidate to add tags to (required for "add_to_candidate")'),
      tagNames: z
        .array(z.string())
        .optional()
        .describe('Tag names to add to the candidate (required for "add_to_candidate")'),
      query: z.string().optional().describe('Search query to filter tags (for "list_tags")')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.number().optional().describe('Tag ID'),
            name: z.string().describe('Tag name'),
            taggingsCount: z.number().optional().describe('Number of times this tag is used')
          })
        )
        .optional()
        .describe('List of tags'),
      added: z.boolean().optional().describe('Whether tags were successfully added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    if (ctx.input.action === 'list_tags') {
      let result = await client.listTags({ query: ctx.input.query });
      let tagList = result.tags || [];
      return {
        output: {
          tags: tagList.map((t: any) => ({
            tagId: t.id,
            name: t.name,
            taggingsCount: t.taggings_count
          }))
        },
        message: `Found ${tagList.length} tags.`
      };
    }

    if (ctx.input.action === 'add_to_candidate') {
      if (!ctx.input.candidateId) {
        throw new Error('candidateId is required for adding tags.');
      }
      if (!ctx.input.tagNames || ctx.input.tagNames.length === 0) {
        throw new Error('tagNames is required for adding tags.');
      }
      await client.addTagsToCandidate(ctx.input.candidateId, ctx.input.tagNames);
      return {
        output: {
          added: true
        },
        message: `Added tags [${ctx.input.tagNames.join(', ')}] to candidate ${ctx.input.candidateId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
