import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let manageChatter = SlateTool.create(spec, {
  name: 'Manage Chatter',
  key: 'manage_chatter',
  description: `Interact with Salesforce Chatter feeds. Post updates to records, groups, or user feeds, and retrieve feed items. Chatter provides social collaboration features within Salesforce.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['getFeed', 'postFeedItem'])
        .describe('Action to perform: get a feed or post to a feed'),
      feedType: z
        .string()
        .optional()
        .default('news')
        .describe('Feed type for getFeed (e.g., news, record, to)'),
      subjectId: z
        .string()
        .optional()
        .describe('The record or group ID to get feed for or post to'),
      text: z.string().optional().describe('Text content to post (required for postFeedItem)')
    })
  )
  .output(
    z.object({
      chatterResult: z.any().describe('Chatter feed items or post result')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'postFeedItem') {
      if (!ctx.input.subjectId || !ctx.input.text) {
        throw new Error('subjectId and text are required for postFeedItem');
      }
      let result = await client.postChatterFeedItem(ctx.input.subjectId, ctx.input.text);
      return {
        output: { chatterResult: result },
        message: `Posted to Chatter feed for \`${ctx.input.subjectId}\``
      };
    }

    let result = await client.getChatterFeed(
      ctx.input.feedType ?? 'news',
      ctx.input.subjectId
    );
    return {
      output: { chatterResult: result },
      message: `Retrieved **${ctx.input.feedType}** Chatter feed`
    };
  })
  .build();
