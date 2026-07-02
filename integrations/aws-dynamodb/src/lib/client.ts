import { createAxios } from 'slates';
import { dynamoDbApiError } from './errors';
import { signRequest } from './signing';

export interface DynamoDBClientConfig {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

export interface AttributeValue {
  S?: string;
  N?: string;
  B?: string;
  SS?: string[];
  NS?: string[];
  BS?: string[];
  M?: Record<string, AttributeValue>;
  L?: AttributeValue[];
  NULL?: boolean;
  BOOL?: boolean;
}

export type DynamoDBItem = Record<string, AttributeValue>;

export interface KeySchemaElement {
  AttributeName: string;
  KeyType: 'HASH' | 'RANGE';
}

export interface AttributeDefinition {
  AttributeName: string;
  AttributeType: 'S' | 'N' | 'B';
}

export interface ProvisionedThroughput {
  ReadCapacityUnits: number;
  WriteCapacityUnits: number;
}

export interface GlobalSecondaryIndex {
  IndexName: string;
  KeySchema: KeySchemaElement[];
  Projection: {
    ProjectionType: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
    NonKeyAttributes?: string[];
  };
  ProvisionedThroughput?: ProvisionedThroughput;
}

export interface LocalSecondaryIndex {
  IndexName: string;
  KeySchema: KeySchemaElement[];
  Projection: {
    ProjectionType: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
    NonKeyAttributes?: string[];
  };
}

export class DynamoDBClient {
  private endpoint: string;
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private sessionToken?: string;

  constructor(config: DynamoDBClientConfig) {
    this.region = config.region;
    this.endpoint = `https://dynamodb.${config.region}.amazonaws.com`;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.sessionToken = config.sessionToken;
  }

  private async request(target: string, payload: Record<string, any>): Promise<any> {
    let body = JSON.stringify(payload);
    let url = this.endpoint;

    let headers: Record<string, string> = {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': `DynamoDB_20120810.${target}`
    };

    let signedHeaders = signRequest({
      method: 'POST',
      url,
      headers,
      body,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      sessionToken: this.sessionToken,
      region: this.region,
      service: 'dynamodb'
    });

    let axiosInstance = createAxios({
      baseURL: this.endpoint
    });

    try {
      let response = await axiosInstance.post('/', body, {
        headers: signedHeaders
      });

      return response.data;
    } catch (error) {
      throw dynamoDbApiError(error, target);
    }
  }

  private async streamsRequest(target: string, payload: Record<string, any>): Promise<any> {
    let endpoint = `https://streams.dynamodb.${this.region}.amazonaws.com`;
    let body = JSON.stringify(payload);

    let headers: Record<string, string> = {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': `DynamoDBStreams_20120810.${target}`
    };

    let signedHeaders = signRequest({
      method: 'POST',
      url: endpoint,
      headers,
      body,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      sessionToken: this.sessionToken,
      region: this.region,
      service: 'dynamodb'
    });

    let axiosInstance = createAxios({ baseURL: endpoint });
    try {
      let response = await axiosInstance.post('/', body, { headers: signedHeaders });
      return response.data;
    } catch (error) {
      throw dynamoDbApiError(error, `DynamoDB Streams ${target}`);
    }
  }

  // Table Management

  async createTable(params: {
    tableName: string;
    keySchema: KeySchemaElement[];
    attributeDefinitions: AttributeDefinition[];
    billingMode?: 'PROVISIONED' | 'PAY_PER_REQUEST';
    provisionedThroughput?: ProvisionedThroughput;
    globalSecondaryIndexes?: GlobalSecondaryIndex[];
    localSecondaryIndexes?: LocalSecondaryIndex[];
    tableClass?: 'STANDARD' | 'STANDARD_INFREQUENT_ACCESS';
    streamSpecification?: {
      StreamEnabled: boolean;
      StreamViewType?: 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';
    };
    tags?: { Key: string; Value: string }[];
    deletionProtectionEnabled?: boolean;
  }): Promise<any> {
    let payload: Record<string, any> = {
      TableName: params.tableName,
      KeySchema: params.keySchema,
      AttributeDefinitions: params.attributeDefinitions
    };

    if (params.billingMode) payload.BillingMode = params.billingMode;
    if (params.provisionedThroughput)
      payload.ProvisionedThroughput = params.provisionedThroughput;
    if (params.globalSecondaryIndexes)
      payload.GlobalSecondaryIndexes = params.globalSecondaryIndexes;
    if (params.localSecondaryIndexes)
      payload.LocalSecondaryIndexes = params.localSecondaryIndexes;
    if (params.tableClass) payload.TableClass = params.tableClass;
    if (params.streamSpecification) payload.StreamSpecification = params.streamSpecification;
    if (params.tags) payload.Tags = params.tags;
    if (params.deletionProtectionEnabled !== undefined)
      payload.DeletionProtectionEnabled = params.deletionProtectionEnabled;

    return this.request('CreateTable', payload);
  }

  async describeTable(tableName: string): Promise<any> {
    return this.request('DescribeTable', { TableName: tableName });
  }

  async listTables(params?: {
    exclusiveStartTableName?: string;
    limit?: number;
  }): Promise<any> {
    let payload: Record<string, any> = {};
    if (params?.exclusiveStartTableName)
      payload.ExclusiveStartTableName = params.exclusiveStartTableName;
    if (params?.limit) payload.Limit = params.limit;
    return this.request('ListTables', payload);
  }

  async deleteTable(tableName: string): Promise<any> {
    return this.request('DeleteTable', { TableName: tableName });
  }

  async updateTable(params: {
    tableName: string;
    billingMode?: 'PROVISIONED' | 'PAY_PER_REQUEST';
    provisionedThroughput?: ProvisionedThroughput;
    globalSecondaryIndexUpdates?: any[];
    streamSpecification?: {
      StreamEnabled: boolean;
      StreamViewType?: 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';
    };
    tableClass?: 'STANDARD' | 'STANDARD_INFREQUENT_ACCESS';
    deletionProtectionEnabled?: boolean;
  }): Promise<any> {
    let payload: Record<string, any> = {
      TableName: params.tableName
    };
    if (params.billingMode) payload.BillingMode = params.billingMode;
    if (params.provisionedThroughput)
      payload.ProvisionedThroughput = params.provisionedThroughput;
    if (params.globalSecondaryIndexUpdates)
      payload.GlobalSecondaryIndexUpdates = params.globalSecondaryIndexUpdates;
    if (params.streamSpecification) payload.StreamSpecification = params.streamSpecification;
    if (params.tableClass) payload.TableClass = params.tableClass;
    if (params.deletionProtectionEnabled !== undefined)
      payload.DeletionProtectionEnabled = params.deletionProtectionEnabled;
    return this.request('UpdateTable', payload);
  }

  // Item Operations

  async putItem(params: {
    tableName: string;
    item: DynamoDBItem;
    conditionExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues?: DynamoDBItem;
    returnValues?: 'NONE' | 'ALL_OLD';
  }): Promise<any> {
    let payload: Record<string, any> = {
      TableName: params.tableName,
      Item: params.item
    };
    if (params.conditionExpression) payload.ConditionExpression = params.conditionExpression;
    if (params.expressionAttributeNames)
      payload.ExpressionAttributeNames = params.expressionAttributeNames;
    if (params.expressionAttributeValues)
      payload.ExpressionAttributeValues = params.expressionAttributeValues;
    if (params.returnValues) payload.ReturnValues = params.returnValues;
    return this.request('PutItem', payload);
  }

  async getItem(params: {
    tableName: string;
    key: DynamoDBItem;
    consistentRead?: boolean;
    projectionExpression?: string;
    expressionAttributeNames?: Record<string, string>;
  }): Promise<any> {
    let payload: Record<string, any> = {
      TableName: params.tableName,
      Key: params.key
    };
    if (params.consistentRead !== undefined) payload.ConsistentRead = params.consistentRead;
    if (params.projectionExpression)
      payload.ProjectionExpression = params.projectionExpression;
    if (params.expressionAttributeNames)
      payload.ExpressionAttributeNames = params.expressionAttributeNames;
    return this.request('GetItem', payload);
  }

  async updateItem(params: {
    tableName: string;
    key: DynamoDBItem;
    updateExpression: string;
    conditionExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues?: DynamoDBItem;
    returnValues?: 'NONE' | 'UPDATED_OLD' | 'UPDATED_NEW' | 'ALL_OLD' | 'ALL_NEW';
  }): Promise<any> {
    let payload: Record<string, any> = {
      TableName: params.tableName,
      Key: params.key,
      UpdateExpression: params.updateExpression
    };
    if (params.conditionExpression) payload.ConditionExpression = params.conditionExpression;
    if (params.expressionAttributeNames)
      payload.ExpressionAttributeNames = params.expressionAttributeNames;
    if (params.expressionAttributeValues)
      payload.ExpressionAttributeValues = params.expressionAttributeValues;
    if (params.returnValues) payload.ReturnValues = params.returnValues;
    return this.request('UpdateItem', payload);
  }

  async deleteItem(params: {
    tableName: string;
    key: DynamoDBItem;
    conditionExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues?: DynamoDBItem;
    returnValues?: 'NONE' | 'ALL_OLD';
  }): Promise<any> {
    let payload: Record<string, any> = {
      TableName: params.tableName,
      Key: params.key
    };
    if (params.conditionExpression) payload.ConditionExpression = params.conditionExpression;
    if (params.expressionAttributeNames)
      payload.ExpressionAttributeNames = params.expressionAttributeNames;
    if (params.expressionAttributeValues)
      payload.ExpressionAttributeValues = params.expressionAttributeValues;
    if (params.returnValues) payload.ReturnValues = params.returnValues;
    return this.request('DeleteItem', payload);
  }

  // Query and Scan

  async query(params: {
    tableName: string;
    indexName?: string;
    keyConditionExpression: string;
    filterExpression?: string;
    projectionExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues?: DynamoDBItem;
    limit?: number;
    scanIndexForward?: boolean;
    consistentRead?: boolean;
    exclusiveStartKey?: DynamoDBItem;
    select?: 'ALL_ATTRIBUTES' | 'ALL_PROJECTED_ATTRIBUTES' | 'SPECIFIC_ATTRIBUTES' | 'COUNT';
  }): Promise<any> {
    let payload: Record<string, any> = {
      TableName: params.tableName,
      KeyConditionExpression: params.keyConditionExpression
    };
    if (params.indexName) payload.IndexName = params.indexName;
    if (params.filterExpression) payload.FilterExpression = params.filterExpression;
    if (params.projectionExpression)
      payload.ProjectionExpression = params.projectionExpression;
    if (params.expressionAttributeNames)
      payload.ExpressionAttributeNames = params.expressionAttributeNames;
    if (params.expressionAttributeValues)
      payload.ExpressionAttributeValues = params.expressionAttributeValues;
    if (params.limit !== undefined) payload.Limit = params.limit;
    if (params.scanIndexForward !== undefined)
      payload.ScanIndexForward = params.scanIndexForward;
    if (params.consistentRead !== undefined) payload.ConsistentRead = params.consistentRead;
    if (params.exclusiveStartKey) payload.ExclusiveStartKey = params.exclusiveStartKey;
    if (params.select) payload.Select = params.select;
    return this.request('Query', payload);
  }

  async scan(params: {
    tableName: string;
    indexName?: string;
    filterExpression?: string;
    projectionExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues?: DynamoDBItem;
    limit?: number;
    consistentRead?: boolean;
    exclusiveStartKey?: DynamoDBItem;
    segment?: number;
    totalSegments?: number;
    select?: 'ALL_ATTRIBUTES' | 'ALL_PROJECTED_ATTRIBUTES' | 'SPECIFIC_ATTRIBUTES' | 'COUNT';
  }): Promise<any> {
    let payload: Record<string, any> = {
      TableName: params.tableName
    };
    if (params.indexName) payload.IndexName = params.indexName;
    if (params.filterExpression) payload.FilterExpression = params.filterExpression;
    if (params.projectionExpression)
      payload.ProjectionExpression = params.projectionExpression;
    if (params.expressionAttributeNames)
      payload.ExpressionAttributeNames = params.expressionAttributeNames;
    if (params.expressionAttributeValues)
      payload.ExpressionAttributeValues = params.expressionAttributeValues;
    if (params.limit !== undefined) payload.Limit = params.limit;
    if (params.consistentRead !== undefined) payload.ConsistentRead = params.consistentRead;
    if (params.exclusiveStartKey) payload.ExclusiveStartKey = params.exclusiveStartKey;
    if (params.segment !== undefined) payload.Segment = params.segment;
    if (params.totalSegments !== undefined) payload.TotalSegments = params.totalSegments;
    if (params.select) payload.Select = params.select;
    return this.request('Scan', payload);
  }

  // Batch Operations

  async batchGetItem(params: {
    requestItems: Record<
      string,
      {
        Keys: DynamoDBItem[];
        ConsistentRead?: boolean;
        ProjectionExpression?: string;
        ExpressionAttributeNames?: Record<string, string>;
      }
    >;
  }): Promise<any> {
    return this.request('BatchGetItem', {
      RequestItems: params.requestItems
    });
  }

  async batchWriteItem(params: {
    requestItems: Record<
      string,
      Array<{
        PutRequest?: { Item: DynamoDBItem };
        DeleteRequest?: { Key: DynamoDBItem };
      }>
    >;
  }): Promise<any> {
    return this.request('BatchWriteItem', {
      RequestItems: params.requestItems
    });
  }

  // Transactions

  async transactWriteItems(params: {
    transactItems: Array<{
      ConditionCheck?: {
        TableName: string;
        Key: DynamoDBItem;
        ConditionExpression: string;
        ExpressionAttributeNames?: Record<string, string>;
        ExpressionAttributeValues?: DynamoDBItem;
      };
      Put?: {
        TableName: string;
        Item: DynamoDBItem;
        ConditionExpression?: string;
        ExpressionAttributeNames?: Record<string, string>;
        ExpressionAttributeValues?: DynamoDBItem;
      };
      Delete?: {
        TableName: string;
        Key: DynamoDBItem;
        ConditionExpression?: string;
        ExpressionAttributeNames?: Record<string, string>;
        ExpressionAttributeValues?: DynamoDBItem;
      };
      Update?: {
        TableName: string;
        Key: DynamoDBItem;
        UpdateExpression: string;
        ConditionExpression?: string;
        ExpressionAttributeNames?: Record<string, string>;
        ExpressionAttributeValues?: DynamoDBItem;
      };
    }>;
    clientRequestToken?: string;
  }): Promise<any> {
    let payload: Record<string, any> = {
      TransactItems: params.transactItems
    };
    if (params.clientRequestToken) payload.ClientRequestToken = params.clientRequestToken;
    return this.request('TransactWriteItems', payload);
  }

  async transactGetItems(params: {
    transactItems: Array<{
      Get: {
        TableName: string;
        Key: DynamoDBItem;
        ProjectionExpression?: string;
        ExpressionAttributeNames?: Record<string, string>;
      };
    }>;
    returnConsumedCapacity?: 'INDEXES' | 'TOTAL' | 'NONE';
  }): Promise<any> {
    let payload: Record<string, any> = {
      TransactItems: params.transactItems
    };
    if (params.returnConsumedCapacity)
      payload.ReturnConsumedCapacity = params.returnConsumedCapacity;
    return this.request('TransactGetItems', payload);
  }

  // PartiQL

  async executeStatement(params: {
    statement: string;
    parameters?: AttributeValue[];
    consistentRead?: boolean;
    nextToken?: string;
    limit?: number;
  }): Promise<any> {
    let payload: Record<string, any> = {
      Statement: params.statement
    };
    if (params.parameters) payload.Parameters = params.parameters;
    if (params.consistentRead !== undefined) payload.ConsistentRead = params.consistentRead;
    if (params.nextToken) payload.NextToken = params.nextToken;
    if (params.limit !== undefined) payload.Limit = params.limit;
    return this.request('ExecuteStatement', payload);
  }

  // TTL

  async describeTimeToLive(tableName: string): Promise<any> {
    return this.request('DescribeTimeToLive', { TableName: tableName });
  }

  async updateTimeToLive(params: {
    tableName: string;
    enabled: boolean;
    attributeName: string;
  }): Promise<any> {
    return this.request('UpdateTimeToLive', {
      TableName: params.tableName,
      TimeToLiveSpecification: {
        Enabled: params.enabled,
        AttributeName: params.attributeName
      }
    });
  }

  // Streams

  async listStreams(params?: {
    tableName?: string;
    exclusiveStartStreamArn?: string;
    limit?: number;
  }): Promise<any> {
    let payload: Record<string, any> = {};
    if (params?.tableName) payload.TableName = params.tableName;
    if (params?.exclusiveStartStreamArn)
      payload.ExclusiveStartStreamArn = params.exclusiveStartStreamArn;
    if (params?.limit) payload.Limit = params.limit;
    return this.streamsRequest('ListStreams', payload);
  }

  async describeStream(params: {
    streamArn: string;
    exclusiveStartShardId?: string;
    limit?: number;
  }): Promise<any> {
    let payload: Record<string, any> = {
      StreamArn: params.streamArn
    };
    if (params.exclusiveStartShardId)
      payload.ExclusiveStartShardId = params.exclusiveStartShardId;
    if (params.limit !== undefined) payload.Limit = params.limit;
    return this.streamsRequest('DescribeStream', payload);
  }

  async getShardIterator(params: {
    streamArn: string;
    shardId: string;
    shardIteratorType:
      | 'TRIM_HORIZON'
      | 'LATEST'
      | 'AT_SEQUENCE_NUMBER'
      | 'AFTER_SEQUENCE_NUMBER';
    sequenceNumber?: string;
  }): Promise<any> {
    let payload: Record<string, any> = {
      StreamArn: params.streamArn,
      ShardId: params.shardId,
      ShardIteratorType: params.shardIteratorType
    };
    if (params.sequenceNumber) payload.SequenceNumber = params.sequenceNumber;
    return this.streamsRequest('GetShardIterator', payload);
  }

  async getRecords(params: { shardIterator: string; limit?: number }): Promise<any> {
    let payload: Record<string, any> = {
      ShardIterator: params.shardIterator
    };
    if (params.limit !== undefined) payload.Limit = params.limit;
    return this.streamsRequest('GetRecords', payload);
  }

  // Backup operations

  async createBackup(params: { tableName: string; backupName: string }): Promise<any> {
    return this.request('CreateBackup', {
      TableName: params.tableName,
      BackupName: params.backupName
    });
  }

  async listBackups(params?: {
    tableName?: string;
    exclusiveStartBackupArn?: string;
    limit?: number;
    backupType?: 'USER' | 'SYSTEM' | 'AWS_BACKUP' | 'ALL';
  }): Promise<any> {
    let payload: Record<string, any> = {};
    if (params?.tableName) payload.TableName = params.tableName;
    if (params?.exclusiveStartBackupArn)
      payload.ExclusiveStartBackupArn = params.exclusiveStartBackupArn;
    if (params?.limit) payload.Limit = params.limit;
    if (params?.backupType) payload.BackupType = params.backupType;
    return this.request('ListBackups', payload);
  }

  async deleteBackup(backupArn: string): Promise<any> {
    return this.request('DeleteBackup', { BackupArn: backupArn });
  }

  async describeBackup(backupArn: string): Promise<any> {
    return this.request('DescribeBackup', { BackupArn: backupArn });
  }

  async restoreTableFromBackup(params: {
    backupArn: string;
    targetTableName: string;
    billingModeOverride?: 'PROVISIONED' | 'PAY_PER_REQUEST';
    provisionedThroughputOverride?: ProvisionedThroughput;
  }): Promise<any> {
    let payload: Record<string, any> = {
      BackupArn: params.backupArn,
      TargetTableName: params.targetTableName
    };
    if (params.billingModeOverride) payload.BillingModeOverride = params.billingModeOverride;
    if (params.provisionedThroughputOverride)
      payload.ProvisionedThroughputOverride = params.provisionedThroughputOverride;
    return this.request('RestoreTableFromBackup', payload);
  }

  async describeContinuousBackups(tableName: string): Promise<any> {
    return this.request('DescribeContinuousBackups', { TableName: tableName });
  }

  async updateContinuousBackups(params: {
    tableName: string;
    pointInTimeRecoveryEnabled: boolean;
  }): Promise<any> {
    return this.request('UpdateContinuousBackups', {
      TableName: params.tableName,
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: params.pointInTimeRecoveryEnabled
      }
    });
  }
}
