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

export let addComment = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add a community comment to any VirusTotal resource (file, URL, domain, or IP address). Comments support VirusTotal-flavored markdown.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['file', 'url', 'domain', 'ip'])
        .describe('Type of resource to comment on'),
      resourceId: z
        .string()
        .describe('Resource identifier (file hash, URL id, domain, or IP address)'),
      text: z.string().describe('Comment text (supports VirusTotal markdown)')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the created comment'),
      text: z.string().optional().describe('The comment text'),
      date: z.string().optional().describe('Comment creation date (Unix timestamp)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let apiType = resourceTypeMap[ctx.input.resourceType] ?? ctx.input.resourceType;
    let result = await client.addComment(apiType, ctx.input.resourceId, ctx.input.text);

    return {
      output: {
        commentId: result?.id ?? '',
        text: result?.attributes?.text,
        date: result?.attributes?.date?.toString()
      },
      message: `Comment added to ${ctx.input.resourceType} \`${ctx.input.resourceId}\`.`
    };
  })
  .build();
