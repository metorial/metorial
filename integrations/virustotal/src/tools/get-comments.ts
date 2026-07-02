import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let resourceTypeMap: Record<string, string> = {
  file: 'files',
  url: 'urls',
  domain: 'domains',
  ip: 'ip_addresses'
};

export let getComments = SlateTool.create(spec, {
  name: 'Get Comments',
  key: 'get_comments',
  description: `Retrieve community comments for a VirusTotal resource (file, URL, domain, or IP address). Comments include analysis notes, threat intelligence, and other context contributed by community members.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z.enum(['file', 'url', 'domain', 'ip']).describe('Type of resource'),
      resourceId: z
        .string()
        .describe('Resource identifier (file hash, URL id, domain, or IP address)'),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of comments to return'),
      cursor: z.string().optional().describe('Pagination cursor for next page of results')
    })
  )
  .output(
    z.object({
      comments: z
        .array(
          z.object({
            commentId: z.string().describe('Comment ID'),
            text: z.string().optional().describe('Comment text'),
            date: z.string().optional().describe('Comment date (Unix timestamp)'),
            votes: z
              .object({
                positive: z.number().optional(),
                negative: z.number().optional(),
                abuse: z.number().optional()
              })
              .optional()
              .describe('Comment vote counts')
          })
        )
        .describe('List of comments'),
      nextCursor: z.string().optional().describe('Cursor for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let apiType = resourceTypeMap[ctx.input.resourceType] ?? ctx.input.resourceType;
    let result = await client.getComments(
      apiType,
      ctx.input.resourceId,
      ctx.input.limit,
      ctx.input.cursor
    );

    let comments = (result?.data ?? []).map((c: any) => ({
      commentId: c.id ?? '',
      text: c.attributes?.text,
      date: c.attributes?.date?.toString(),
      votes: c.attributes?.votes
        ? {
            positive: c.attributes.votes.positive,
            negative: c.attributes.votes.negative,
            abuse: c.attributes.votes.abuse
          }
        : undefined
    }));

    return {
      output: {
        comments,
        nextCursor: result?.links?.next ? result.meta?.cursor : undefined
      },
      message: `Found **${comments.length}** comments on ${ctx.input.resourceType} \`${ctx.input.resourceId}\`.`
    };
  })
  .build();
