import { createAxios } from 'slates';
import { type AwsCredentials, signRequest } from './signing';

export interface SqsClientConfig {
  region: string;
  credentials: AwsCredentials;
}

export interface MessageAttribute {
  dataType: string;
  stringValue?: string;
}

export interface SendMessageParams {
  queueUrl: string;
  messageBody: string;
  delaySeconds?: number;
  messageAttributes?: Record<string, MessageAttribute>;
  messageGroupId?: string;
  messageDeduplicationId?: string;
}

export interface SendMessageBatchEntry {
  messageId: string;
  messageBody: string;
  delaySeconds?: number;
  messageAttributes?: Record<string, MessageAttribute>;
  messageGroupId?: string;
  messageDeduplicationId?: string;
}

export interface ReceiveMessagesParams {
  queueUrl: string;
  maxNumberOfMessages?: number;
  visibilityTimeout?: number;
  waitTimeSeconds?: number;
  messageAttributeNames?: string[];
  messageSystemAttributeNames?: string[];
}

export interface SqsMessage {
  messageId: string;
  receiptHandle: string;
  body: string;
  md5OfBody: string;
  attributes?: Record<string, string>;
  messageAttributes?: Record<string, { dataType: string; stringValue?: string }>;
  md5OfMessageAttributes?: string;
}

export interface CreateQueueParams {
  queueName: string;
  attributes?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface QueueAttributes {
  [key: string]: string;
}

export class SqsClient {
  private region: string;
  private credentials: AwsCredentials;

  constructor(config: SqsClientConfig) {
    this.region = config.region;
    this.credentials = config.credentials;
  }

  private getEndpoint(): string {
    return `https://sqs.${this.region}.amazonaws.com`;
  }

  private async request<T>(action: string, body: Record<string, unknown>): Promise<T> {
    let endpoint = this.getEndpoint();
    let jsonBody = JSON.stringify(body);

    let headers = signRequest({
      method: 'POST',
      url: endpoint,
      region: this.region,
      service: 'sqs',
      credentials: this.credentials,
      headers: {
        'Content-Type': 'application/x-amz-json-1.0',
        'X-Amz-Target': `AmazonSQS.${action}`
      },
      body: jsonBody
    });

    let ax = createAxios({ baseURL: endpoint });
    let response = await ax.post('/', jsonBody, { headers });
    return response.data as T;
  }

  async createQueue(params: CreateQueueParams): Promise<{ queueUrl: string }> {
    let body: Record<string, unknown> = {
      QueueName: params.queueName
    };
    if (params.attributes) {
      body.Attributes = params.attributes;
    }
    if (params.tags) {
      body.tags = params.tags;
    }

    let result = await this.request<{ QueueUrl: string }>('CreateQueue', body);
    return { queueUrl: result.QueueUrl };
  }

  async deleteQueue(queueUrl: string): Promise<void> {
    await this.request<Record<string, never>>('DeleteQueue', { QueueUrl: queueUrl });
  }

  async listQueues(params?: {
    queueNamePrefix?: string;
    maxResults?: number;
    nextToken?: string;
  }): Promise<{ queueUrls: string[]; nextToken?: string }> {
    let body: Record<string, unknown> = {};
    if (params?.queueNamePrefix) {
      body.QueueNamePrefix = params.queueNamePrefix;
    }
    if (params?.maxResults) {
      body.MaxResults = params.maxResults;
    }
    if (params?.nextToken) {
      body.NextToken = params.nextToken;
    }

    let result = await this.request<{ QueueUrls?: string[]; NextToken?: string }>(
      'ListQueues',
      body
    );
    return {
      queueUrls: result.QueueUrls ?? [],
      nextToken: result.NextToken
    };
  }

  async getQueueUrl(queueName: string, queueOwnerAccountId?: string): Promise<string> {
    let body: Record<string, unknown> = { QueueName: queueName };
    if (queueOwnerAccountId) {
      body.QueueOwnerAWSAccountId = queueOwnerAccountId;
    }

    let result = await this.request<{ QueueUrl: string }>('GetQueueUrl', body);
    return result.QueueUrl;
  }

  async getQueueAttributes(
    queueUrl: string,
    attributeNames?: string[]
  ): Promise<QueueAttributes> {
    let body: Record<string, unknown> = {
      QueueUrl: queueUrl,
      AttributeNames: attributeNames ?? ['All']
    };

    let result = await this.request<{ Attributes?: Record<string, string> }>(
      'GetQueueAttributes',
      body
    );
    return result.Attributes ?? {};
  }

  async setQueueAttributes(
    queueUrl: string,
    attributes: Record<string, string>
  ): Promise<void> {
    await this.request<Record<string, never>>('SetQueueAttributes', {
      QueueUrl: queueUrl,
      Attributes: attributes
    });
  }

  async sendMessage(
    params: SendMessageParams
  ): Promise<{ messageId: string; md5OfMessageBody: string; sequenceNumber?: string }> {
    let body: Record<string, unknown> = {
      QueueUrl: params.queueUrl,
      MessageBody: params.messageBody
    };

    if (params.delaySeconds !== undefined) {
      body.DelaySeconds = params.delaySeconds;
    }
    if (params.messageAttributes) {
      let attrs: Record<string, { DataType: string; StringValue?: string }> = {};
      for (let [key, val] of Object.entries(params.messageAttributes)) {
        attrs[key] = { DataType: val.dataType, StringValue: val.stringValue };
      }
      body.MessageAttributes = attrs;
    }
    if (params.messageGroupId) {
      body.MessageGroupId = params.messageGroupId;
    }
    if (params.messageDeduplicationId) {
      body.MessageDeduplicationId = params.messageDeduplicationId;
    }

    let result = await this.request<{
      MessageId: string;
      MD5OfMessageBody: string;
      SequenceNumber?: string;
    }>('SendMessage', body);
    return {
      messageId: result.MessageId,
      md5OfMessageBody: result.MD5OfMessageBody,
      sequenceNumber: result.SequenceNumber
    };
  }

  async sendMessageBatch(
    queueUrl: string,
    entries: SendMessageBatchEntry[]
  ): Promise<{
    successful: {
      messageId: string;
      sqsMessageId: string;
      md5OfMessageBody: string;
      sequenceNumber?: string;
    }[];
    failed: { messageId: string; senderFault: boolean; code: string; message?: string }[];
  }> {
    let body: Record<string, unknown> = {
      QueueUrl: queueUrl,
      Entries: entries.map(entry => {
        let e: Record<string, unknown> = {
          Id: entry.messageId,
          MessageBody: entry.messageBody
        };
        if (entry.delaySeconds !== undefined) {
          e.DelaySeconds = entry.delaySeconds;
        }
        if (entry.messageAttributes) {
          let attrs: Record<string, { DataType: string; StringValue?: string }> = {};
          for (let [key, val] of Object.entries(entry.messageAttributes)) {
            attrs[key] = { DataType: val.dataType, StringValue: val.stringValue };
          }
          e.MessageAttributes = attrs;
        }
        if (entry.messageGroupId) {
          e.MessageGroupId = entry.messageGroupId;
        }
        if (entry.messageDeduplicationId) {
          e.MessageDeduplicationId = entry.messageDeduplicationId;
        }
        return e;
      })
    };

    let result = await this.request<{
      Successful?: {
        Id: string;
        MessageId: string;
        MD5OfMessageBody: string;
        SequenceNumber?: string;
      }[];
      Failed?: { Id: string; SenderFault: boolean; Code: string; Message?: string }[];
    }>('SendMessageBatch', body);

    return {
      successful: (result.Successful ?? []).map(s => ({
        messageId: s.Id,
        sqsMessageId: s.MessageId,
        md5OfMessageBody: s.MD5OfMessageBody,
        sequenceNumber: s.SequenceNumber
      })),
      failed: (result.Failed ?? []).map(f => ({
        messageId: f.Id,
        senderFault: f.SenderFault,
        code: f.Code,
        message: f.Message
      }))
    };
  }

  async receiveMessages(params: ReceiveMessagesParams): Promise<SqsMessage[]> {
    let body: Record<string, unknown> = {
      QueueUrl: params.queueUrl
    };

    if (params.maxNumberOfMessages !== undefined) {
      body.MaxNumberOfMessages = params.maxNumberOfMessages;
    }
    if (params.visibilityTimeout !== undefined) {
      body.VisibilityTimeout = params.visibilityTimeout;
    }
    if (params.waitTimeSeconds !== undefined) {
      body.WaitTimeSeconds = params.waitTimeSeconds;
    }
    if (params.messageAttributeNames) {
      body.MessageAttributeNames = params.messageAttributeNames;
    }
    if (params.messageSystemAttributeNames) {
      body.MessageSystemAttributeNames = params.messageSystemAttributeNames;
    }

    let result = await this.request<{
      Messages?: {
        MessageId: string;
        ReceiptHandle: string;
        Body: string;
        MD5OfBody: string;
        Attributes?: Record<string, string>;
        MessageAttributes?: Record<string, { DataType: string; StringValue?: string }>;
        MD5OfMessageAttributes?: string;
      }[];
    }>('ReceiveMessage', body);

    return (result.Messages ?? []).map(m => ({
      messageId: m.MessageId,
      receiptHandle: m.ReceiptHandle,
      body: m.Body,
      md5OfBody: m.MD5OfBody,
      attributes: m.Attributes,
      messageAttributes: m.MessageAttributes
        ? Object.fromEntries(
            Object.entries(m.MessageAttributes).map(([k, v]) => [
              k,
              { dataType: v.DataType, stringValue: v.StringValue }
            ])
          )
        : undefined,
      md5OfMessageAttributes: m.MD5OfMessageAttributes
    }));
  }

  async deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    await this.request<Record<string, never>>('DeleteMessage', {
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle
    });
  }

  async deleteMessageBatch(
    queueUrl: string,
    entries: { receiptHandle: string; entryId: string }[]
  ): Promise<{
    successful: string[];
    failed: { entryId: string; code: string; message?: string; senderFault: boolean }[];
  }> {
    let result = await this.request<{
      Successful?: { Id: string }[];
      Failed?: { Id: string; Code: string; Message?: string; SenderFault: boolean }[];
    }>('DeleteMessageBatch', {
      QueueUrl: queueUrl,
      Entries: entries.map(e => ({
        Id: e.entryId,
        ReceiptHandle: e.receiptHandle
      }))
    });

    return {
      successful: (result.Successful ?? []).map(s => s.Id),
      failed: (result.Failed ?? []).map(f => ({
        entryId: f.Id,
        code: f.Code,
        message: f.Message,
        senderFault: f.SenderFault
      }))
    };
  }

  async changeMessageVisibility(
    queueUrl: string,
    receiptHandle: string,
    visibilityTimeout: number
  ): Promise<void> {
    await this.request<Record<string, never>>('ChangeMessageVisibility', {
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
      VisibilityTimeout: visibilityTimeout
    });
  }

  async purgeQueue(queueUrl: string): Promise<void> {
    await this.request<Record<string, never>>('PurgeQueue', { QueueUrl: queueUrl });
  }

  async tagQueue(queueUrl: string, tags: Record<string, string>): Promise<void> {
    await this.request<Record<string, never>>('TagQueue', {
      QueueUrl: queueUrl,
      Tags: tags
    });
  }

  async untagQueue(queueUrl: string, tagKeys: string[]): Promise<void> {
    await this.request<Record<string, never>>('UntagQueue', {
      QueueUrl: queueUrl,
      TagKeys: tagKeys
    });
  }

  async listQueueTags(queueUrl: string): Promise<Record<string, string>> {
    let result = await this.request<{ Tags?: Record<string, string> }>('ListQueueTags', {
      QueueUrl: queueUrl
    });
    return result.Tags ?? {};
  }

  async addPermission(
    queueUrl: string,
    label: string,
    awsAccountIds: string[],
    actions: string[]
  ): Promise<void> {
    await this.request<Record<string, never>>('AddPermission', {
      QueueUrl: queueUrl,
      Label: label,
      AWSAccountIds: awsAccountIds,
      Actions: actions
    });
  }

  async removePermission(queueUrl: string, label: string): Promise<void> {
    await this.request<Record<string, never>>('RemovePermission', {
      QueueUrl: queueUrl,
      Label: label
    });
  }

  async startMessageMoveTask(
    sourceArn: string,
    destinationArn?: string,
    maxNumberOfMessagesPerSecond?: number
  ): Promise<{ taskHandle: string }> {
    let body: Record<string, unknown> = {
      SourceArn: sourceArn
    };
    if (destinationArn) {
      body.DestinationArn = destinationArn;
    }
    if (maxNumberOfMessagesPerSecond !== undefined) {
      body.MaxNumberOfMessagesPerSecond = maxNumberOfMessagesPerSecond;
    }

    let result = await this.request<{ TaskHandle: string }>('StartMessageMoveTask', body);
    return { taskHandle: result.TaskHandle };
  }

  async listMessageMoveTasks(
    sourceArn: string,
    maxResults?: number
  ): Promise<{
    results: {
      taskHandle?: string;
      status?: string;
      sourceArn?: string;
      destinationArn?: string;
      approximateNumberOfMessagesMoved?: number;
      approximateNumberOfMessagesToMove?: number;
      startedTimestamp?: number;
      failureReason?: string;
    }[];
  }> {
    let body: Record<string, unknown> = { SourceArn: sourceArn };
    if (maxResults !== undefined) {
      body.MaxResults = maxResults;
    }

    let result = await this.request<{
      Results?: {
        TaskHandle?: string;
        Status?: string;
        SourceArn?: string;
        DestinationArn?: string;
        ApproximateNumberOfMessagesMoved?: number;
        ApproximateNumberOfMessagesToMove?: number;
        StartedTimestamp?: number;
        FailureReason?: string;
      }[];
    }>('ListMessageMoveTasks', body);

    return {
      results: (result.Results ?? []).map(r => ({
        taskHandle: r.TaskHandle,
        status: r.Status,
        sourceArn: r.SourceArn,
        destinationArn: r.DestinationArn,
        approximateNumberOfMessagesMoved: r.ApproximateNumberOfMessagesMoved,
        approximateNumberOfMessagesToMove: r.ApproximateNumberOfMessagesToMove,
        startedTimestamp: r.StartedTimestamp,
        failureReason: r.FailureReason
      }))
    };
  }

  async cancelMessageMoveTask(
    taskHandle: string
  ): Promise<{ approximateNumberOfMessagesMoved: number }> {
    let result = await this.request<{ ApproximateNumberOfMessagesMoved: number }>(
      'CancelMessageMoveTask',
      {
        TaskHandle: taskHandle
      }
    );
    return { approximateNumberOfMessagesMoved: result.ApproximateNumberOfMessagesMoved };
  }

  async listDeadLetterSourceQueues(
    queueUrl: string,
    maxResults?: number,
    nextToken?: string
  ): Promise<{ queueUrls: string[]; nextToken?: string }> {
    let body: Record<string, unknown> = { QueueUrl: queueUrl };
    if (maxResults !== undefined) {
      body.MaxResults = maxResults;
    }
    if (nextToken) {
      body.NextToken = nextToken;
    }

    let result = await this.request<{ queueUrls?: string[]; NextToken?: string }>(
      'ListDeadLetterSourceQueues',
      body
    );
    return {
      queueUrls: result.queueUrls ?? [],
      nextToken: result.NextToken
    };
  }
}
