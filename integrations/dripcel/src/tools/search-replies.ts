import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchReplies = SlateTool.create(spec, {
  name: 'Search Replies',
  key: 'search_replies',
  description: `Search and view replies received from contacts. Replies are classified as optIn, optOut, or unknown. Filter by campaign, contact number, message content, date range, and classification type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Filter by campaign ID(s)'),
      msisdn: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Filter by contact cell number(s)'),
      message: z.string().optional().describe('Filter by reply message content'),
      kind: z
        .union([
          z.enum(['optIn', 'optOut', 'unknown']),
          z.array(z.enum(['optIn', 'optOut', 'unknown']))
        ])
        .optional()
        .describe('Filter by reply classification'),
      receivedAfter: z
        .string()
        .optional()
        .describe('Filter replies received on or after this date (ISO 8601)'),
      receivedBefore: z
        .string()
        .optional()
        .describe('Filter replies received on or before this date (ISO 8601)'),
      replyId: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Filter by specific reply ID(s)')
    })
  )
  .output(
    z.object({
      replies: z.array(z.any()).describe('Array of reply records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let received: { $gte?: string; $lte?: string } | undefined;
    if (ctx.input.receivedAfter || ctx.input.receivedBefore) {
      received = {};
      if (ctx.input.receivedAfter) received.$gte = ctx.input.receivedAfter;
      if (ctx.input.receivedBefore) received.$lte = ctx.input.receivedBefore;
    }

    let result = await client.searchReplies({
      replyId: ctx.input.replyId,
      message: ctx.input.message,
      kind: ctx.input.kind,
      msisdn: ctx.input.msisdn,
      campaignId: ctx.input.campaignId,
      received
    });

    let replies = Array.isArray(result.data) ? result.data : [];
    return {
      output: { replies },
      message: `Found **${replies.length}** reply(ies).`
    };
  })
  .build();
