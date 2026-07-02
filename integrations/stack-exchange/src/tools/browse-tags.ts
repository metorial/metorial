import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tagSchema = z.object({
  name: z.string().describe('Name of the tag'),
  count: z.number().describe('Number of questions with this tag'),
  hasSynonyms: z.boolean().optional().describe('Whether this tag has synonyms'),
  isModeratorOnly: z.boolean().optional().describe('Whether this tag is moderator-only'),
  isRequired: z.boolean().optional().describe('Whether this tag is required')
});

export let browseTags = SlateTool.create(spec, {
  name: 'Browse Tags',
  key: 'browse_tags',
  description: `Browse and search tags on a Stack Exchange site. Look up tag metadata, find related tags, view synonyms, and discover frequently asked questions for specific tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Filter tags containing this text'),
      tagNames: z
        .array(z.string())
        .optional()
        .describe('Specific tag names to look up (for info, synonyms, related, or FAQ)'),
      include: z
        .enum(['list', 'info', 'synonyms', 'related', 'faq'])
        .optional()
        .default('list')
        .describe(
          'What to retrieve: list (browse all), info (tag details), synonyms, related tags, or faq'
        ),
      sort: z
        .enum(['popular', 'activity', 'name'])
        .optional()
        .describe('How to sort tags (for list mode)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (1-indexed)'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      tags: z
        .array(tagSchema)
        .optional()
        .describe('List of tags (for list, info, related modes)'),
      synonyms: z
        .array(
          z.object({
            fromTag: z.string().describe('The synonym tag name'),
            toTag: z.string().describe('The canonical/master tag name'),
            creationDate: z
              .string()
              .optional()
              .describe('When the synonym was created (ISO 8601)')
          })
        )
        .optional()
        .describe('Tag synonyms (for synonyms mode)'),
      faqQuestions: z
        .array(
          z.object({
            questionId: z.number(),
            title: z.string(),
            link: z.string(),
            score: z.number(),
            answerCount: z.number()
          })
        )
        .optional()
        .describe('Frequently asked questions (for faq mode)'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      key: ctx.auth.key,
      site: ctx.config.site
    });

    let { include, tagNames, search, sort, order, page, pageSize } = ctx.input;

    if (include === 'info' && tagNames?.length) {
      let result = await client.getTagInfo(tagNames);
      let tags = result.items.map((t: any) => ({
        name: t.name,
        count: t.count,
        hasSynonyms: t.has_synonyms,
        isModeratorOnly: t.is_moderator_only,
        isRequired: t.is_required
      }));
      return {
        output: { tags, hasMore: false },
        message: `Retrieved info for **${tags.length}** tag(s).`
      };
    }

    if (include === 'synonyms' && tagNames?.length) {
      let result = await client.getTagSynonyms(tagNames, { page, pageSize });
      let synonyms = result.items.map((s: any) => ({
        fromTag: s.from_tag,
        toTag: s.to_tag,
        creationDate: s.creation_date
          ? new Date(s.creation_date * 1000).toISOString()
          : undefined
      }));
      return {
        output: { synonyms, hasMore: result.hasMore },
        message: `Found **${synonyms.length}** synonym(s).`
      };
    }

    if (include === 'related' && tagNames?.length) {
      let result = await client.getRelatedTags(tagNames);
      let tags = result.items.map((t: any) => ({
        name: t.name,
        count: t.count,
        hasSynonyms: t.has_synonyms,
        isModeratorOnly: t.is_moderator_only,
        isRequired: t.is_required
      }));
      return {
        output: { tags, hasMore: false },
        message: `Found **${tags.length}** related tag(s).`
      };
    }

    if (include === 'faq' && tagNames?.length) {
      let result = await client.getTagFaq(tagNames, { page, pageSize });
      let faqQuestions = result.items.map((q: any) => ({
        questionId: q.question_id,
        title: q.title,
        link: q.link,
        score: q.score,
        answerCount: q.answer_count
      }));
      return {
        output: { faqQuestions, hasMore: result.hasMore },
        message: `Found **${faqQuestions.length}** FAQ question(s).`
      };
    }

    // Default: list/browse tags
    let result = await client.getTags({
      inName: search,
      sort,
      order,
      page,
      pageSize
    });

    let tags = result.items.map((t: any) => ({
      name: t.name,
      count: t.count,
      hasSynonyms: t.has_synonyms,
      isModeratorOnly: t.is_moderator_only,
      isRequired: t.is_required
    }));

    return {
      output: { tags, hasMore: result.hasMore },
      message: `Found **${tags.length}** tag(s)${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
