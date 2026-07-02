import { ServiceError } from '@lowerdeck/error';
import { createAxios } from 'slates';
import { snsApiError } from './errors';
import { signRequest } from './sigv4';
import { parseAwsError, parseXml } from './xml-parser';

export interface SnsClientConfig {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

export interface TopicAttributes {
  displayName?: string;
  deliveryPolicy?: string;
  policy?: string;
  kmsMasterKeyId?: string;
  fifoTopic?: boolean;
  contentBasedDeduplication?: boolean;
  fifoThroughputScope?: string;
  tracingConfig?: string;
  archivePolicy?: string;
}

export interface PublishParams {
  topicArn?: string;
  targetArn?: string;
  phoneNumber?: string;
  message: string;
  subject?: string;
  messageStructure?: string;
  messageGroupId?: string;
  messageDeduplicationId?: string;
  messageAttributes?: Record<
    string,
    { dataType: string; stringValue?: string; binaryValue?: string }
  >;
}

export interface PublishBatchEntry {
  id: string;
  message: string;
  subject?: string;
  messageStructure?: string;
  messageGroupId?: string;
  messageDeduplicationId?: string;
  messageAttributes?: Record<
    string,
    { dataType: string; stringValue?: string; binaryValue?: string }
  >;
}

export interface SubscribeParams {
  topicArn: string;
  protocol: string;
  endpoint?: string;
  returnSubscriptionArn?: boolean;
  attributes?: Record<string, string>;
}

export interface Subscription {
  subscriptionArn: string;
  owner: string;
  protocol: string;
  endpoint: string;
  topicArn: string;
}

export interface OriginationNumber {
  createdAt?: string;
  iso2CountryCode?: string;
  numberCapabilities: string[];
  phoneNumber: string;
  routeType?: string;
  status?: string;
}

let asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

let addMessageAttributes = (
  params: Record<string, string>,
  prefix: string,
  attributes?: Record<string, { dataType: string; stringValue?: string; binaryValue?: string }>
) => {
  if (!attributes) return;

  let attrIndex = 1;
  for (let [name, attr] of Object.entries(attributes)) {
    params[`${prefix}.entry.${attrIndex}.Name`] = name;
    params[`${prefix}.entry.${attrIndex}.Value.DataType`] = attr.dataType;
    if (attr.stringValue !== undefined) {
      params[`${prefix}.entry.${attrIndex}.Value.StringValue`] = attr.stringValue;
    }
    if (attr.binaryValue !== undefined) {
      params[`${prefix}.entry.${attrIndex}.Value.BinaryValue`] = attr.binaryValue;
    }
    attrIndex++;
  }
};

export class SnsClient {
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private sessionToken?: string;
  private baseUrl: string;

  constructor(config: SnsClientConfig) {
    this.region = config.region;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.sessionToken = config.sessionToken;
    this.baseUrl = `https://sns.${this.region}.amazonaws.com`;
  }

  private async request(params: Record<string, string>): Promise<Record<string, any>> {
    let operation = params.Action || 'request';
    let allParams: Record<string, string> = {
      ...params,
      Version: '2010-03-31'
    };

    let body = Object.entries(allParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    let headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
    };

    let sigHeaders = signRequest({
      method: 'POST',
      url: `${this.baseUrl}/`,
      headers,
      body,
      region: this.region,
      service: 'sns',
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      sessionToken: this.sessionToken
    });

    let ax = createAxios({
      baseURL: this.baseUrl
    });

    try {
      let response = await ax.post('/', body, {
        headers: {
          ...headers,
          ...sigHeaders
        },
        validateStatus: () => true
      });

      let responseText =
        typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      if (response.status >= 400) {
        let error = parseAwsError(responseText);
        throw snsApiError({
          operation,
          status: response.status,
          code: error.code,
          message: error.message
        });
      }

      return parseXml(responseText);
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw snsApiError({
        operation,
        message: error instanceof Error ? error.message : 'Unknown error',
        parent: error
      });
    }
  }

  // Topic Management

  async createTopic(
    name: string,
    attributes?: TopicAttributes,
    tags?: Record<string, string>
  ): Promise<{ topicArn: string }> {
    let params: Record<string, string> = {
      Action: 'CreateTopic',
      Name: name
    };

    if (attributes) {
      let attrIndex = 1;
      if (attributes.displayName !== undefined) {
        params[`Attributes.entry.${attrIndex}.key`] = 'DisplayName';
        params[`Attributes.entry.${attrIndex}.value`] = attributes.displayName;
        attrIndex++;
      }
      if (attributes.deliveryPolicy !== undefined) {
        params[`Attributes.entry.${attrIndex}.key`] = 'DeliveryPolicy';
        params[`Attributes.entry.${attrIndex}.value`] = attributes.deliveryPolicy;
        attrIndex++;
      }
      if (attributes.policy !== undefined) {
        params[`Attributes.entry.${attrIndex}.key`] = 'Policy';
        params[`Attributes.entry.${attrIndex}.value`] = attributes.policy;
        attrIndex++;
      }
      if (attributes.kmsMasterKeyId !== undefined) {
        params[`Attributes.entry.${attrIndex}.key`] = 'KmsMasterKeyId';
        params[`Attributes.entry.${attrIndex}.value`] = attributes.kmsMasterKeyId;
        attrIndex++;
      }
      if (attributes.fifoTopic !== undefined) {
        params[`Attributes.entry.${attrIndex}.key`] = 'FifoTopic';
        params[`Attributes.entry.${attrIndex}.value`] = String(attributes.fifoTopic);
        attrIndex++;
      }
      if (attributes.contentBasedDeduplication !== undefined) {
        params[`Attributes.entry.${attrIndex}.key`] = 'ContentBasedDeduplication';
        params[`Attributes.entry.${attrIndex}.value`] = String(
          attributes.contentBasedDeduplication
        );
        attrIndex++;
      }
      if (attributes.fifoThroughputScope !== undefined) {
        params[`Attributes.entry.${attrIndex}.key`] = 'FifoThroughputScope';
        params[`Attributes.entry.${attrIndex}.value`] = attributes.fifoThroughputScope;
        attrIndex++;
      }
      if (attributes.tracingConfig !== undefined) {
        params[`Attributes.entry.${attrIndex}.key`] = 'TracingConfig';
        params[`Attributes.entry.${attrIndex}.value`] = attributes.tracingConfig;
        attrIndex++;
      }
      if (attributes.archivePolicy !== undefined) {
        params[`Attributes.entry.${attrIndex}.key`] = 'ArchivePolicy';
        params[`Attributes.entry.${attrIndex}.value`] = attributes.archivePolicy;
        attrIndex++;
      }
    }

    if (tags) {
      let tagIndex = 1;
      for (let [key, value] of Object.entries(tags)) {
        params[`Tags.member.${tagIndex}.Key`] = key;
        params[`Tags.member.${tagIndex}.Value`] = value;
        tagIndex++;
      }
    }

    let result = await this.request(params);
    let topicArn = result?.CreateTopicResponse?.CreateTopicResult?.TopicArn;
    return { topicArn };
  }

  async deleteTopic(topicArn: string): Promise<void> {
    await this.request({
      Action: 'DeleteTopic',
      TopicArn: topicArn
    });
  }

  async listTopics(nextToken?: string): Promise<{ topicArns: string[]; nextToken?: string }> {
    let params: Record<string, string> = {
      Action: 'ListTopics'
    };
    if (nextToken) {
      params.NextToken = nextToken;
    }

    let result = await this.request(params);
    let topicsResult = result?.ListTopicsResponse?.ListTopicsResult;

    let rawTopics = topicsResult?.Topics;
    let topicArns: string[] = [];

    if (Array.isArray(rawTopics)) {
      topicArns = rawTopics.map((t: any) => t.TopicArn).filter(Boolean);
    } else if (rawTopics?.TopicArn) {
      topicArns = [rawTopics.TopicArn];
    }

    return {
      topicArns,
      nextToken: topicsResult?.NextToken || undefined
    };
  }

  async getTopicAttributes(topicArn: string): Promise<Record<string, string>> {
    let result = await this.request({
      Action: 'GetTopicAttributes',
      TopicArn: topicArn
    });

    let attrs = result?.GetTopicAttributesResponse?.GetTopicAttributesResult?.Attributes;
    return attrs || {};
  }

  async setTopicAttributes(
    topicArn: string,
    attributeName: string,
    attributeValue: string
  ): Promise<void> {
    await this.request({
      Action: 'SetTopicAttributes',
      TopicArn: topicArn,
      AttributeName: attributeName,
      AttributeValue: attributeValue
    });
  }

  // Message Publishing

  async publish(
    publishParams: PublishParams
  ): Promise<{ messageId: string; sequenceNumber?: string }> {
    let params: Record<string, string> = {
      Action: 'Publish',
      Message: publishParams.message
    };

    if (publishParams.topicArn) params.TopicArn = publishParams.topicArn;
    if (publishParams.targetArn) params.TargetArn = publishParams.targetArn;
    if (publishParams.phoneNumber) params.PhoneNumber = publishParams.phoneNumber;
    if (publishParams.subject) params.Subject = publishParams.subject;
    if (publishParams.messageStructure)
      params.MessageStructure = publishParams.messageStructure;
    if (publishParams.messageGroupId) params.MessageGroupId = publishParams.messageGroupId;
    if (publishParams.messageDeduplicationId)
      params.MessageDeduplicationId = publishParams.messageDeduplicationId;

    addMessageAttributes(params, 'MessageAttributes', publishParams.messageAttributes);

    let result = await this.request(params);
    let publishResult = result?.PublishResponse?.PublishResult;

    return {
      messageId: publishResult?.MessageId || '',
      sequenceNumber: publishResult?.SequenceNumber || undefined
    };
  }

  async publishBatch(
    topicArn: string,
    entries: PublishBatchEntry[]
  ): Promise<{
    successful: Array<{ id: string; messageId: string; sequenceNumber?: string }>;
    failed: Array<{ id: string; code: string; message?: string; senderFault: boolean }>;
  }> {
    let params: Record<string, string> = {
      Action: 'PublishBatch',
      TopicArn: topicArn
    };

    entries.forEach((entry, index) => {
      let prefix = `PublishBatchRequestEntries.member.${index + 1}`;
      params[`${prefix}.Id`] = entry.id;
      params[`${prefix}.Message`] = entry.message;
      if (entry.subject) params[`${prefix}.Subject`] = entry.subject;
      if (entry.messageStructure)
        params[`${prefix}.MessageStructure`] = entry.messageStructure;
      if (entry.messageGroupId) params[`${prefix}.MessageGroupId`] = entry.messageGroupId;
      if (entry.messageDeduplicationId) {
        params[`${prefix}.MessageDeduplicationId`] = entry.messageDeduplicationId;
      }
      addMessageAttributes(params, `${prefix}.MessageAttributes`, entry.messageAttributes);
    });

    let result = await this.request(params);
    let batchResult = result?.PublishBatchResponse?.PublishBatchResult;

    return {
      successful: asArray<any>(batchResult?.Successful).map(entry => ({
        id: entry.Id || '',
        messageId: entry.MessageId || '',
        sequenceNumber: entry.SequenceNumber || undefined
      })),
      failed: asArray<any>(batchResult?.Failed).map(entry => ({
        id: entry.Id || '',
        code: entry.Code || '',
        message: entry.Message || undefined,
        senderFault: entry.SenderFault === true || entry.SenderFault === 'true'
      }))
    };
  }

  // Subscription Management

  async subscribe(subscribeParams: SubscribeParams): Promise<{ subscriptionArn: string }> {
    let params: Record<string, string> = {
      Action: 'Subscribe',
      TopicArn: subscribeParams.topicArn,
      Protocol: subscribeParams.protocol,
      ReturnSubscriptionArn: String(subscribeParams.returnSubscriptionArn ?? true)
    };

    if (subscribeParams.endpoint) {
      params.Endpoint = subscribeParams.endpoint;
    }

    if (subscribeParams.attributes) {
      let attrIndex = 1;
      for (let [key, value] of Object.entries(subscribeParams.attributes)) {
        params[`Attributes.entry.${attrIndex}.key`] = key;
        params[`Attributes.entry.${attrIndex}.value`] = value;
        attrIndex++;
      }
    }

    let result = await this.request(params);
    let subscriptionArn = result?.SubscribeResponse?.SubscribeResult?.SubscriptionArn;
    return { subscriptionArn: subscriptionArn || 'pending confirmation' };
  }

  async unsubscribe(subscriptionArn: string): Promise<void> {
    await this.request({
      Action: 'Unsubscribe',
      SubscriptionArn: subscriptionArn
    });
  }

  async confirmSubscription(
    topicArn: string,
    token: string,
    authenticateOnUnsubscribe?: boolean
  ): Promise<{ subscriptionArn: string }> {
    let params: Record<string, string> = {
      Action: 'ConfirmSubscription',
      TopicArn: topicArn,
      Token: token
    };
    if (authenticateOnUnsubscribe !== undefined) {
      params.AuthenticateOnUnsubscribe = String(authenticateOnUnsubscribe);
    }

    let result = await this.request(params);
    let subscriptionArn =
      result?.ConfirmSubscriptionResponse?.ConfirmSubscriptionResult?.SubscriptionArn;
    return { subscriptionArn: subscriptionArn || '' };
  }

  async listSubscriptionsByTopic(
    topicArn: string,
    nextToken?: string
  ): Promise<{
    subscriptions: Subscription[];
    nextToken?: string;
  }> {
    let params: Record<string, string> = {
      Action: 'ListSubscriptionsByTopic',
      TopicArn: topicArn
    };
    if (nextToken) {
      params.NextToken = nextToken;
    }

    let result = await this.request(params);
    let subResult = result?.ListSubscriptionsByTopicResponse?.ListSubscriptionsByTopicResult;

    let rawSubs = subResult?.Subscriptions;
    let subscriptions: Subscription[] = [];

    if (Array.isArray(rawSubs)) {
      subscriptions = rawSubs.map((s: any) => ({
        subscriptionArn: s.SubscriptionArn || '',
        owner: s.Owner || '',
        protocol: s.Protocol || '',
        endpoint: s.Endpoint || '',
        topicArn: s.TopicArn || ''
      }));
    } else if (rawSubs?.SubscriptionArn) {
      subscriptions = [
        {
          subscriptionArn: rawSubs.SubscriptionArn || '',
          owner: rawSubs.Owner || '',
          protocol: rawSubs.Protocol || '',
          endpoint: rawSubs.Endpoint || '',
          topicArn: rawSubs.TopicArn || ''
        }
      ];
    }

    return {
      subscriptions,
      nextToken: subResult?.NextToken || undefined
    };
  }

  async listSubscriptions(nextToken?: string): Promise<{
    subscriptions: Subscription[];
    nextToken?: string;
  }> {
    let params: Record<string, string> = {
      Action: 'ListSubscriptions'
    };
    if (nextToken) {
      params.NextToken = nextToken;
    }

    let result = await this.request(params);
    let subResult = result?.ListSubscriptionsResponse?.ListSubscriptionsResult;

    let rawSubs = subResult?.Subscriptions;
    let subscriptions: Subscription[] = [];

    if (Array.isArray(rawSubs)) {
      subscriptions = rawSubs.map((s: any) => ({
        subscriptionArn: s.SubscriptionArn || '',
        owner: s.Owner || '',
        protocol: s.Protocol || '',
        endpoint: s.Endpoint || '',
        topicArn: s.TopicArn || ''
      }));
    } else if (rawSubs?.SubscriptionArn) {
      subscriptions = [
        {
          subscriptionArn: rawSubs.SubscriptionArn || '',
          owner: rawSubs.Owner || '',
          protocol: rawSubs.Protocol || '',
          endpoint: rawSubs.Endpoint || '',
          topicArn: rawSubs.TopicArn || ''
        }
      ];
    }

    return {
      subscriptions,
      nextToken: subResult?.NextToken || undefined
    };
  }

  async getSubscriptionAttributes(subscriptionArn: string): Promise<Record<string, string>> {
    let result = await this.request({
      Action: 'GetSubscriptionAttributes',
      SubscriptionArn: subscriptionArn
    });

    let attrs =
      result?.GetSubscriptionAttributesResponse?.GetSubscriptionAttributesResult?.Attributes;
    return attrs || {};
  }

  async setSubscriptionAttributes(
    subscriptionArn: string,
    attributeName: string,
    attributeValue: string
  ): Promise<void> {
    await this.request({
      Action: 'SetSubscriptionAttributes',
      SubscriptionArn: subscriptionArn,
      AttributeName: attributeName,
      AttributeValue: attributeValue
    });
  }

  // Tag Management

  async tagResource(resourceArn: string, tags: Record<string, string>): Promise<void> {
    let params: Record<string, string> = {
      Action: 'TagResource',
      ResourceArn: resourceArn
    };
    let tagIndex = 1;
    for (let [key, value] of Object.entries(tags)) {
      params[`Tags.member.${tagIndex}.Key`] = key;
      params[`Tags.member.${tagIndex}.Value`] = value;
      tagIndex++;
    }
    await this.request(params);
  }

  async untagResource(resourceArn: string, tagKeys: string[]): Promise<void> {
    let params: Record<string, string> = {
      Action: 'UntagResource',
      ResourceArn: resourceArn
    };
    tagKeys.forEach((key, index) => {
      params[`TagKeys.member.${index + 1}`] = key;
    });
    await this.request(params);
  }

  async listTagsForResource(resourceArn: string): Promise<Record<string, string>> {
    let result = await this.request({
      Action: 'ListTagsForResource',
      ResourceArn: resourceArn
    });

    let rawTags = result?.ListTagsForResourceResponse?.ListTagsForResourceResult?.Tags;
    let tags: Record<string, string> = {};

    if (Array.isArray(rawTags)) {
      for (let tag of rawTags) {
        if (tag.Key && tag.Value !== undefined) {
          tags[tag.Key] = tag.Value;
        }
      }
    }

    return tags;
  }

  // SMS

  async getSMSAttributes(attributeNames?: string[]): Promise<Record<string, string>> {
    let params: Record<string, string> = {
      Action: 'GetSMSAttributes'
    };
    attributeNames?.forEach((name, index) => {
      params[`attributes.member.${index + 1}`] = name;
    });

    let result = await this.request(params);
    let attrs = result?.GetSMSAttributesResponse?.GetSMSAttributesResult?.attributes;
    return attrs || {};
  }

  async setSMSAttributes(attributes: Record<string, string>): Promise<void> {
    let params: Record<string, string> = {
      Action: 'SetSMSAttributes'
    };

    let attrIndex = 1;
    for (let [key, value] of Object.entries(attributes)) {
      params[`attributes.entry.${attrIndex}.key`] = key;
      params[`attributes.entry.${attrIndex}.value`] = value;
      attrIndex++;
    }

    await this.request(params);
  }

  async getSMSSandboxAccountStatus(): Promise<{ isInSandbox: boolean }> {
    let result = await this.request({
      Action: 'GetSMSSandboxAccountStatus'
    });
    let isInSandbox =
      result?.GetSMSSandboxAccountStatusResponse?.GetSMSSandboxAccountStatusResult
        ?.IsInSandbox;

    return { isInSandbox: isInSandbox === true || isInSandbox === 'true' };
  }

  async checkIfPhoneNumberIsOptedOut(phoneNumber: string): Promise<boolean> {
    let result = await this.request({
      Action: 'CheckIfPhoneNumberIsOptedOut',
      phoneNumber: phoneNumber
    });
    let isOptedOut =
      result?.CheckIfPhoneNumberIsOptedOutResponse?.CheckIfPhoneNumberIsOptedOutResult
        ?.isOptedOut;
    return isOptedOut === true || isOptedOut === 'true';
  }

  async listPhoneNumbersOptedOut(
    nextToken?: string
  ): Promise<{ phoneNumbers: string[]; nextToken?: string }> {
    let params: Record<string, string> = {
      Action: 'ListPhoneNumbersOptedOut'
    };
    if (nextToken) {
      params.nextToken = nextToken;
    }

    let result = await this.request(params);
    let listResult = result?.ListPhoneNumbersOptedOutResponse?.ListPhoneNumbersOptedOutResult;

    return {
      phoneNumbers: asArray<string>(listResult?.phoneNumbers).filter(Boolean),
      nextToken: listResult?.nextToken || undefined
    };
  }

  async listOriginationNumbers(paramsInput?: {
    maxResults?: number;
    nextToken?: string;
  }): Promise<{ phoneNumbers: OriginationNumber[]; nextToken?: string }> {
    let params: Record<string, string> = {
      Action: 'ListOriginationNumbers'
    };
    if (paramsInput?.maxResults !== undefined) {
      params.MaxResults = String(paramsInput.maxResults);
    }
    if (paramsInput?.nextToken) {
      params.NextToken = paramsInput.nextToken;
    }

    let result = await this.request(params);
    let listResult = result?.ListOriginationNumbersResponse?.ListOriginationNumbersResult;

    return {
      phoneNumbers: asArray<any>(listResult?.PhoneNumbers).map(phoneNumber => ({
        createdAt: phoneNumber.CreatedAt || undefined,
        iso2CountryCode: phoneNumber.Iso2CountryCode || undefined,
        numberCapabilities: asArray<string>(phoneNumber.NumberCapabilities).filter(Boolean),
        phoneNumber: phoneNumber.PhoneNumber || '',
        routeType: phoneNumber.RouteType || undefined,
        status: phoneNumber.Status || undefined
      })),
      nextToken: listResult?.NextToken || undefined
    };
  }
}
