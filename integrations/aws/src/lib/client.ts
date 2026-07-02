import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EC2Client } from '@aws-sdk/client-ec2';
import { IAMClient } from '@aws-sdk/client-iam';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
import { STSClient } from '@aws-sdk/client-sts';
import { createSlatesAwsSdkHttpHandler } from '@slates/aws-sdk-http-handler';
import { awsApiError } from './errors';

export interface AwsClientConfig {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

type AwsSdkCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

export class AwsClient {
  readonly region: string;
  readonly credentials: AwsSdkCredentials;

  #cloudWatch?: CloudWatchClient;
  #dynamoDb?: DynamoDBClient;
  #ec2?: EC2Client;
  #iam?: IAMClient;
  #lambda?: LambdaClient;
  #s3?: S3Client;
  #sns?: SNSClient;
  #sqs?: SQSClient;
  #sts?: STSClient;
  #requestHandler = createSlatesAwsSdkHttpHandler();

  constructor(config: AwsClientConfig) {
    this.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      sessionToken: config.sessionToken
    };
    this.region = config.region;
  }

  private clientConfig(region = this.region) {
    return {
      region,
      credentials: this.credentials,
      requestHandler: this.#requestHandler
    };
  }

  get cloudWatch() {
    return (this.#cloudWatch ??= new CloudWatchClient(this.clientConfig()));
  }

  get dynamoDb() {
    return (this.#dynamoDb ??= new DynamoDBClient(this.clientConfig()));
  }

  get ec2() {
    return (this.#ec2 ??= new EC2Client(this.clientConfig()));
  }

  get iam() {
    return (this.#iam ??= new IAMClient(this.clientConfig('us-east-1')));
  }

  get lambda() {
    return (this.#lambda ??= new LambdaClient(this.clientConfig()));
  }

  get s3() {
    return (this.#s3 ??= new S3Client(this.clientConfig()));
  }

  get sns() {
    return (this.#sns ??= new SNSClient(this.clientConfig()));
  }

  get sqs() {
    return (this.#sqs ??= new SQSClient(this.clientConfig()));
  }

  get sts() {
    return (this.#sts ??= new STSClient(this.clientConfig('us-east-1')));
  }

  async send<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw awsApiError(error, operation);
    }
  }
}

export let createAwsClient = (config: AwsClientConfig): AwsClient => {
  return new AwsClient(config);
};
