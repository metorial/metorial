import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let listTopics = SlateTool.create(spec, {
  name: 'List Topics',
  key: 'list_topics',
  description: `List all SNS topics in the configured region. Returns topic ARNs with pagination support. Each page returns up to 100 topics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      nextToken: z.string().optional().describe('Pagination token from a previous request')
    })
  )
  .output(
    z.object({
      topicArns: z.array(z.string()).describe('List of topic ARNs'),
      nextToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.listTopics(ctx.input.nextToken);

    return {
      output: result,
      message: `Found **${result.topicArns.length}** topics${result.nextToken ? ' (more available)' : ''}`
    };
  })
  .build();
