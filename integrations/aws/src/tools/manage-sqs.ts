import {
  ChangeMessageVisibilityCommand,
  CreateQueueCommand,
  DeleteMessageCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  ListQueuesCommand,
  PurgeQueueCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SetQueueAttributesCommand
} from '@aws-sdk/client-sqs';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { awsServiceError } from '../lib/errors';
import { clientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let messageSchema = z.object({
  messageId: z.string().describe('Unique message identifier'),
  receiptHandle: z
    .string()
    .describe('Handle needed to delete or change visibility of the message'),
  body: z.string().describe('Message body content'),
  md5OfBody: z.string().describe('MD5 digest of the message body for integrity verification'),
  attributes: z
    .record(z.string(), z.string())
    .optional()
    .describe('System attributes such as SenderId, SentTimestamp, ApproximateReceiveCount')
});

let queueAttributeSchema = z
  .record(z.string(), z.string())
  .describe('Queue attributes as key-value pairs');

let outputSchema = z.object({
  operation: z.string().describe('The operation that was performed'),
  queueUrls: z.array(z.string()).optional().describe('List of queue URLs (for list_queues)'),
  queueUrl: z
    .string()
    .optional()
    .describe('Queue URL (for create_queue and other operations)'),
  messages: z
    .array(messageSchema)
    .optional()
    .describe('Received messages (for receive_messages)'),
  messageId: z.string().optional().describe('ID of the sent message (for send_message)'),
  md5OfMessageBody: z
    .string()
    .optional()
    .describe('MD5 digest of the sent message body (for send_message)'),
  attributes: queueAttributeSchema
    .optional()
    .describe('Queue attributes (for get_queue_attributes)'),
  nextToken: z
    .string()
    .optional()
    .describe('Pagination token for the next page of results (for list_queues)'),
  success: z.boolean().optional().describe('Whether the operation completed successfully')
});

export let manageSqsTool = SlateTool.create(spec, {
  name: 'Manage SQS',
  key: 'manage_sqs',
  description: `Manage Amazon SQS (Simple Queue Service) queues and messages. Supports listing queues, resolving queue URLs, creating and deleting queues, sending and receiving messages, deleting messages, changing message visibility, retrieving and setting queue attributes, and purging all messages from a queue.`,
  instructions: [
    'Use operation "list_queues" to list SQS queues. Optionally filter by "queueNamePrefix" and use "maxResults" for pagination.',
    'Use operation "get_queue_url" to resolve a queue name into its full queue URL. Optionally provide "queueOwnerAccountId" for cross-account queues.',
    'Use operation "create_queue" to create a new queue. Provide "queueName" and optionally "attributes" for configuration such as VisibilityTimeout, DelaySeconds, and MaximumMessageSize.',
    'Use operation "delete_queue" to permanently delete a queue and all its messages. Provide "queueUrl".',
    'Use operation "send_message" to send a message to a queue. Provide "queueUrl" and "messageBody". Optionally set "delaySeconds".',
    'Use operation "receive_messages" to receive messages from a queue. Provide "queueUrl" and optionally "maxNumberOfMessages", "waitTimeSeconds", and "visibilityTimeout".',
    'Use operation "change_message_visibility" to change how long a received message stays hidden. Provide "queueUrl", "receiptHandle", and "visibilityTimeout".',
    'Use operation "delete_message" to delete a processed message. Provide "queueUrl" and "receiptHandle" from the receive response.',
    'Use operation "get_queue_attributes" to retrieve queue configuration and statistics. Provide "queueUrl" and optionally "attributeNames".',
    'Use operation "set_queue_attributes" to update queue configuration. Provide "queueUrl" and "attributes". Most changes can take up to 60 seconds to propagate.',
    'Use operation "purge_queue" to delete all messages from a queue. Provide "queueUrl". This cannot be undone.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum([
          'list_queues',
          'get_queue_url',
          'create_queue',
          'delete_queue',
          'send_message',
          'receive_messages',
          'delete_message',
          'change_message_visibility',
          'get_queue_attributes',
          'set_queue_attributes',
          'purge_queue'
        ])
        .describe('The SQS operation to perform'),
      queueUrl: z
        .string()
        .optional()
        .describe(
          'Full URL of the SQS queue (required for all operations except list_queues and create_queue)'
        ),
      queueName: z
        .string()
        .optional()
        .describe(
          'Name of the queue to create (required for create_queue). FIFO queue names must end with ".fifo". Max 80 characters.'
        ),
      queueNamePrefix: z
        .string()
        .optional()
        .describe('Filter queues by name prefix (for list_queues)'),
      queueOwnerAccountId: z
        .string()
        .optional()
        .describe(
          'AWS account ID that owns the queue (for get_queue_url cross-account access)'
        ),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of queue URLs to return, 1-1000 (for list_queues)'),
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous list_queues response'),
      messageBody: z
        .string()
        .optional()
        .describe('The message content to send, max 256 KB (required for send_message)'),
      delaySeconds: z
        .number()
        .optional()
        .describe(
          'Delay in seconds before the message becomes visible, 0-900 (for send_message and create_queue attributes)'
        ),
      maxNumberOfMessages: z
        .number()
        .optional()
        .describe(
          'Maximum number of messages to receive, 1-10 (for receive_messages). Default: 1'
        ),
      waitTimeSeconds: z
        .number()
        .optional()
        .describe(
          'Long poll wait time in seconds, 0-20 (for receive_messages). 0 = short polling'
        ),
      visibilityTimeout: z
        .number()
        .optional()
        .describe(
          'Duration in seconds that received messages are hidden, 0-43200 (for receive_messages)'
        ),
      receiptHandle: z
        .string()
        .optional()
        .describe('Receipt handle of the message to delete (required for delete_message)'),
      attributeNames: z
        .array(z.string())
        .optional()
        .describe(
          'Attribute names to retrieve, e.g. ["All"], ["ApproximateNumberOfMessages", "QueueArn"] (for get_queue_attributes)'
        ),
      attributes: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Queue attributes for create_queue and set_queue_attributes, e.g. { "VisibilityTimeout": "60", "DelaySeconds": "5", "MaximumMessageSize": "131072" }'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = clientFromContext(ctx);
    let { operation } = ctx.input;

    if (operation === 'list_queues') {
      let response = await client.send('SQS ListQueues', () =>
        client.sqs.send(
          new ListQueuesCommand({
            QueueNamePrefix: ctx.input.queueNamePrefix,
            MaxResults: ctx.input.maxResults,
            NextToken: ctx.input.nextToken
          })
        )
      );
      let queueUrls = response.QueueUrls ?? [];
      let nextToken = response.NextToken;

      let prefixLabel = ctx.input.queueNamePrefix
        ? ` matching prefix "${ctx.input.queueNamePrefix}"`
        : '';
      let paginationLabel = nextToken ? ' (more results available)' : '';

      return {
        output: {
          operation: 'list_queues',
          queueUrls,
          nextToken
        },
        message:
          queueUrls.length === 0
            ? `No queues found${prefixLabel}.`
            : `Found **${queueUrls.length}** queue(s)${prefixLabel}${paginationLabel}.`
      };
    }

    if (operation === 'get_queue_url') {
      if (!ctx.input.queueName)
        throw awsServiceError('queueName is required for get_queue_url');

      let response = await client.send('SQS GetQueueUrl', () =>
        client.sqs.send(
          new GetQueueUrlCommand({
            QueueName: ctx.input.queueName,
            QueueOwnerAWSAccountId: ctx.input.queueOwnerAccountId
          })
        )
      );
      let queueUrl = response.QueueUrl ?? '';

      return {
        output: {
          operation: 'get_queue_url',
          queueUrl
        },
        message: `Resolved queue **${ctx.input.queueName}** to \`${queueUrl}\`.`
      };
    }

    if (operation === 'create_queue') {
      if (!ctx.input.queueName)
        throw awsServiceError('queueName is required for create_queue');

      let response = await client.send('SQS CreateQueue', () =>
        client.sqs.send(
          new CreateQueueCommand({
            QueueName: ctx.input.queueName,
            Attributes: ctx.input.attributes
          })
        )
      );
      let queueUrl = response.QueueUrl ?? '';

      return {
        output: {
          operation: 'create_queue',
          queueUrl
        },
        message: `Created queue **${ctx.input.queueName}** at \`${queueUrl}\`.`
      };
    }

    if (operation === 'delete_queue') {
      if (!ctx.input.queueUrl) throw awsServiceError('queueUrl is required for delete_queue');

      await client.send('SQS DeleteQueue', () =>
        client.sqs.send(new DeleteQueueCommand({ QueueUrl: ctx.input.queueUrl }))
      );

      return {
        output: {
          operation: 'delete_queue',
          queueUrl: ctx.input.queueUrl,
          success: true
        },
        message: `Deleted queue \`${ctx.input.queueUrl}\`. The queue will be fully removed within 60 seconds.`
      };
    }

    if (operation === 'send_message') {
      if (!ctx.input.queueUrl) throw awsServiceError('queueUrl is required for send_message');
      if (!ctx.input.messageBody)
        throw awsServiceError('messageBody is required for send_message');

      let response = await client.send('SQS SendMessage', () =>
        client.sqs.send(
          new SendMessageCommand({
            QueueUrl: ctx.input.queueUrl,
            MessageBody: ctx.input.messageBody,
            DelaySeconds: ctx.input.delaySeconds
          })
        )
      );

      return {
        output: {
          operation: 'send_message',
          queueUrl: ctx.input.queueUrl,
          messageId: response.MessageId ?? '',
          md5OfMessageBody: response.MD5OfMessageBody ?? ''
        },
        message: `Sent message **${response.MessageId ?? ''}** to queue.`
      };
    }

    if (operation === 'receive_messages') {
      if (!ctx.input.queueUrl)
        throw awsServiceError('queueUrl is required for receive_messages');

      let response = await client.send('SQS ReceiveMessage', () =>
        client.sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: ctx.input.queueUrl,
            MaxNumberOfMessages: ctx.input.maxNumberOfMessages,
            WaitTimeSeconds: ctx.input.waitTimeSeconds,
            VisibilityTimeout: ctx.input.visibilityTimeout,
            AttributeNames: ['All']
          })
        )
      );

      let messages = (response.Messages ?? []).map(message => ({
        messageId: message.MessageId ?? '',
        receiptHandle: message.ReceiptHandle ?? '',
        body: message.Body ?? '',
        md5OfBody: message.MD5OfBody ?? '',
        attributes:
          message.Attributes && Object.keys(message.Attributes).length > 0
            ? message.Attributes
            : undefined
      }));

      return {
        output: {
          operation: 'receive_messages',
          queueUrl: ctx.input.queueUrl,
          messages
        },
        message:
          messages.length === 0
            ? 'No messages available in the queue.'
            : `Received **${messages.length}** message(s).`
      };
    }

    if (operation === 'change_message_visibility') {
      if (!ctx.input.queueUrl)
        throw awsServiceError('queueUrl is required for change_message_visibility');
      if (!ctx.input.receiptHandle)
        throw awsServiceError('receiptHandle is required for change_message_visibility');
      if (ctx.input.visibilityTimeout === undefined) {
        throw awsServiceError('visibilityTimeout is required for change_message_visibility');
      }

      await client.send('SQS ChangeMessageVisibility', () =>
        client.sqs.send(
          new ChangeMessageVisibilityCommand({
            QueueUrl: ctx.input.queueUrl,
            ReceiptHandle: ctx.input.receiptHandle,
            VisibilityTimeout: ctx.input.visibilityTimeout
          })
        )
      );

      return {
        output: {
          operation: 'change_message_visibility',
          queueUrl: ctx.input.queueUrl,
          success: true
        },
        message: `Updated message visibility timeout to **${ctx.input.visibilityTimeout}** second(s).`
      };
    }

    if (operation === 'delete_message') {
      if (!ctx.input.queueUrl)
        throw awsServiceError('queueUrl is required for delete_message');
      if (!ctx.input.receiptHandle)
        throw awsServiceError('receiptHandle is required for delete_message');

      await client.send('SQS DeleteMessage', () =>
        client.sqs.send(
          new DeleteMessageCommand({
            QueueUrl: ctx.input.queueUrl,
            ReceiptHandle: ctx.input.receiptHandle
          })
        )
      );

      return {
        output: {
          operation: 'delete_message',
          queueUrl: ctx.input.queueUrl,
          success: true
        },
        message: 'Message deleted successfully.'
      };
    }

    if (operation === 'get_queue_attributes') {
      if (!ctx.input.queueUrl)
        throw awsServiceError('queueUrl is required for get_queue_attributes');

      let response = await client.send('SQS GetQueueAttributes', () =>
        client.sqs.send(
          new GetQueueAttributesCommand({
            QueueUrl: ctx.input.queueUrl,
            AttributeNames: (ctx.input.attributeNames ?? ['All']) as any
          })
        )
      );
      let attributes = response.Attributes ?? {};

      return {
        output: {
          operation: 'get_queue_attributes',
          queueUrl: ctx.input.queueUrl,
          attributes
        },
        message: `Retrieved **${Object.keys(attributes).length}** attribute(s) for queue.`
      };
    }

    if (operation === 'set_queue_attributes') {
      if (!ctx.input.queueUrl)
        throw awsServiceError('queueUrl is required for set_queue_attributes');
      if (!ctx.input.attributes || Object.keys(ctx.input.attributes).length === 0) {
        throw awsServiceError('attributes is required for set_queue_attributes');
      }

      await client.send('SQS SetQueueAttributes', () =>
        client.sqs.send(
          new SetQueueAttributesCommand({
            QueueUrl: ctx.input.queueUrl,
            Attributes: ctx.input.attributes
          })
        )
      );

      return {
        output: {
          operation: 'set_queue_attributes',
          queueUrl: ctx.input.queueUrl,
          attributes: ctx.input.attributes,
          success: true
        },
        message: `Updated **${Object.keys(ctx.input.attributes).length}** queue attribute(s).`
      };
    }

    if (operation === 'purge_queue') {
      if (!ctx.input.queueUrl) throw awsServiceError('queueUrl is required for purge_queue');

      await client.send('SQS PurgeQueue', () =>
        client.sqs.send(new PurgeQueueCommand({ QueueUrl: ctx.input.queueUrl }))
      );

      return {
        output: {
          operation: 'purge_queue',
          queueUrl: ctx.input.queueUrl,
          success: true
        },
        message: 'Purge initiated. All messages will be deleted within 60 seconds.'
      };
    }

    throw awsServiceError(`Unknown operation: ${operation}`);
  })
  .build();
