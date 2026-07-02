import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { requireRedditInput } from '../lib/errors';
import { spec } from '../spec';

export let saveContent = SlateTool.create(spec, {
  name: 'Save Content',
  key: 'save_content',
  description: `Save or unsave a post or comment to your Reddit saved items, or list saved categories available to the authenticated account.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      thingId: z
        .string()
        .optional()
        .describe('Fullname of the post (t3_*) or comment (t1_*) to save or unsave'),
      action: z
        .enum(['save', 'unsave', 'list_categories'])
        .describe('Whether to save, unsave, or list saved categories'),
      category: z.string().optional().describe('Save category name (Reddit Gold feature)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      thingId: z.string().optional().describe('Fullname of the affected item'),
      action: z.string().describe('The action that was performed'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Saved categories returned by list_categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);

    if (ctx.input.action === 'list_categories') {
      let data = await client.getSavedCategories();
      let rawCategories = data?.categories ?? data?.data ?? data;
      let categories = Array.isArray(rawCategories)
        ? rawCategories
            .map((category: any) =>
              typeof category === 'string' ? category : (category?.category ?? category?.name)
            )
            .filter((category: unknown): category is string => typeof category === 'string')
        : [];

      return {
        output: {
          success: true,
          action: ctx.input.action,
          categories
        },
        message: `Retrieved ${categories.length} saved categor${categories.length === 1 ? 'y' : 'ies'}.`
      };
    }

    let thingId = requireRedditInput(
      ctx.input.thingId,
      'thingId is required for save and unsave actions'
    );

    if (ctx.input.action === 'save') {
      await client.save(thingId, ctx.input.category);
    } else {
      await client.unsave(thingId);
    }

    return {
      output: {
        success: true,
        thingId,
        action: ctx.input.action
      },
      message: `Successfully ${ctx.input.action}d \`${thingId}\`.`
    };
  })
  .build();
