import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let listDeadLetterSourceQueues = SlateTool.create(spec, {
  name: 'List Dead-Letter Source Queues',
  key: 'list_dead_letter_source_queues',
  description: `List source queues whose RedrivePolicy uses the specified dead-letter queue. Use this to audit which queues can move failed messages into a DLQ.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      queueUrl: z.string().describe('Full URL of the dead-letter SQS queue'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of source queues to return (1-1000)'),
      nextToken: z.string().optional().describe('Pagination token from a previous request')
    })
  )
  .output(
    z.object({
      queueUrls: z.array(z.string()).describe('Source queue URLs that target this DLQ'),
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

    let result = await client.listDeadLetterSourceQueues(
      ctx.input.queueUrl,
      ctx.input.maxResults,
      ctx.input.nextToken
    );

    let countMsg =
      result.queueUrls.length === 0
        ? 'No source queues found for this dead-letter queue'
        : `Found **${result.queueUrls.length}** source queue(s) for this dead-letter queue`;
    let paginationMsg = result.nextToken ? ' (more results available)' : '';

    return {
      output: result,
      message: `${countMsg}${paginationMsg}`
    };
  })
  .build();
