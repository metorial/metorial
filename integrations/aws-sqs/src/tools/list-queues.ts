import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let listQueues = SlateTool.create(spec, {
  name: 'List Queues',
  key: 'list_queues',
  description: `List SQS queues in the configured AWS region. Optionally filter by queue name prefix and paginate through results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      queueNamePrefix: z
        .string()
        .optional()
        .describe('Filter queues by name prefix (case-sensitive)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results to return (1-1000)'),
      nextToken: z.string().optional().describe('Pagination token from a previous request')
    })
  )
  .output(
    z.object({
      queueUrls: z.array(z.string()).describe('List of queue URLs'),
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SqsClient({
      region: ctx.config.region,
      credentials: {
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken
      }
    });

    let result = await client.listQueues({
      queueNamePrefix: ctx.input.queueNamePrefix,
      maxResults: ctx.input.maxResults,
      nextToken: ctx.input.nextToken
    });

    let countMsg =
      result.queueUrls.length === 0
        ? 'No queues found'
        : `Found **${result.queueUrls.length}** queue(s)`;
    let paginationMsg = result.nextToken ? ' (more results available)' : '';

    return {
      output: result,
      message: `${countMsg}${paginationMsg}`
    };
  })
  .build();
