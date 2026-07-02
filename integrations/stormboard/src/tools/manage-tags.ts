import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create tags in a Storm and associate tag data with ideas. Use action "list" to view all tags, "create" to add a new tag, "tag_idea" to apply a tag to an idea, or "get_idea_tags" to retrieve tags for an idea.`
})
  .input(
    z.object({
      stormId: z.string().describe('ID of the Storm'),
      action: z
        .enum(['list', 'create', 'tag_idea', 'get_idea_tags'])
        .describe('Action to perform'),
      tagName: z.string().optional().describe('Name of the tag (required for create)'),
      ideaId: z
        .string()
        .optional()
        .describe('Idea ID (required for tag_idea and get_idea_tags)'),
      tagId: z.string().optional().describe('Tag ID (required for tag_idea)'),
      tagValue: z.string().optional().describe('Tag value to associate with the idea')
    })
  )
  .output(
    z.object({
      tags: z.array(z.any()).optional().describe('List of tags (for list action)'),
      tag: z.any().optional().describe('Created tag or tag data'),
      ideaTags: z.any().optional().describe('Tags associated with an idea'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });
    let { stormId, action, tagName, ideaId, tagId, tagValue } = ctx.input;

    if (action === 'list') {
      let tags = await client.listTags(stormId);
      let list = Array.isArray(tags) ? tags : [];
      return {
        output: { tags: list, success: true },
        message: `Found **${list.length}** tag(s) in Storm ${stormId}.`
      };
    }

    if (action === 'create') {
      if (!tagName) {
        throw new Error('tagName is required for creating a tag');
      }
      let tag = await client.createTag(stormId, { name: tagName });
      return {
        output: { tag, success: true },
        message: `Created tag **"${tagName}"** in Storm ${stormId}.`
      };
    }

    if (action === 'tag_idea') {
      if (!ideaId || !tagId) {
        throw new Error('ideaId and tagId are required for tagging an idea');
      }
      let tag = await client.createIdeaTagData(stormId, ideaId, {
        tag_id: tagId,
        value: tagValue
      });
      return {
        output: { tag, success: true },
        message: `Tagged idea ${ideaId} with tag ${tagId}.`
      };
    }

    if (action === 'get_idea_tags') {
      if (!ideaId) {
        throw new Error('ideaId is required for getting idea tags');
      }
      let ideaTags = await client.getIdeaTagData(stormId, ideaId);
      return {
        output: { ideaTags, success: true },
        message: `Retrieved tags for idea ${ideaId}.`
      };
    }

    return {
      output: { success: false },
      message: 'Unknown action.'
    };
  })
  .build();
