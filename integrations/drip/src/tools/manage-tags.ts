import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Apply or remove tags on a subscriber. Tags are used for segmentation and triggering automations. You can also list all tags used in the account.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['apply', 'remove', 'list'])
        .describe(
          '"apply" to add a tag, "remove" to delete a tag from a subscriber, "list" to get all account tags.'
        ),
      email: z
        .string()
        .optional()
        .describe('Subscriber email address. Required for apply and remove actions.'),
      tag: z
        .string()
        .optional()
        .describe('The tag name. Required for apply and remove actions.')
    })
  )
  .output(
    z.object({
      tags: z
        .array(z.string())
        .optional()
        .describe('List of all tags (when action is "list").'),
      applied: z
        .boolean()
        .optional()
        .describe('Whether the tag was applied (when action is "apply").'),
      removed: z
        .boolean()
        .optional()
        .describe('Whether the tag was removed (when action is "remove").')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    if (ctx.input.action === 'list') {
      let result = await client.listTags();
      let tagList = result.tags ?? [];
      return {
        output: { tags: tagList },
        message: `Found **${tagList.length}** tags in the account.`
      };
    }

    if (!ctx.input.email || !ctx.input.tag) {
      throw new Error('Both email and tag are required for apply/remove actions.');
    }

    if (ctx.input.action === 'apply') {
      await client.applyTagToSubscriber(ctx.input.email, ctx.input.tag);
      return {
        output: { applied: true },
        message: `Tag **${ctx.input.tag}** applied to **${ctx.input.email}**.`
      };
    }

    await client.removeTagFromSubscriber(ctx.input.email, ctx.input.tag);
    return {
      output: { removed: true },
      message: `Tag **${ctx.input.tag}** removed from **${ctx.input.email}**.`
    };
  })
  .build();
