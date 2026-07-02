import { Buffer } from 'node:buffer';
import {
  AddPermissionCommand,
  LambdaClient as AwsLambdaClient,
  CreateAliasCommand,
  CreateEventSourceMappingCommand,
  CreateFunctionCommand,
  CreateFunctionUrlConfigCommand,
  DeleteAliasCommand,
  DeleteEventSourceMappingCommand,
  DeleteFunctionCommand,
  DeleteFunctionConcurrencyCommand,
  DeleteFunctionEventInvokeConfigCommand,
  DeleteFunctionUrlConfigCommand,
  DeleteLayerVersionCommand,
  DeleteProvisionedConcurrencyConfigCommand,
  GetAccountSettingsCommand,
  GetAliasCommand,
  GetDurableExecutionCommand,
  GetDurableExecutionHistoryCommand,
  GetDurableExecutionStateCommand,
  GetEventSourceMappingCommand,
  GetFunctionCommand,
  GetFunctionConcurrencyCommand,
  GetFunctionConfigurationCommand,
  GetFunctionEventInvokeConfigCommand,
  GetFunctionRecursionConfigCommand,
  GetFunctionUrlConfigCommand,
  GetLayerVersionCommand,
  GetPolicyCommand,
  GetProvisionedConcurrencyConfigCommand,
  GetRuntimeManagementConfigCommand,
  InvokeCommand,
  ListAliasesCommand,
  ListDurableExecutionsByFunctionCommand,
  ListEventSourceMappingsCommand,
  ListFunctionEventInvokeConfigsCommand,
  ListFunctionsCommand,
  ListLayersCommand,
  ListLayerVersionsCommand,
  ListTagsCommand,
  ListVersionsByFunctionCommand,
  PublishLayerVersionCommand,
  PublishVersionCommand,
  PutFunctionConcurrencyCommand,
  PutFunctionEventInvokeConfigCommand,
  PutFunctionRecursionConfigCommand,
  PutProvisionedConcurrencyConfigCommand,
  PutRuntimeManagementConfigCommand,
  RemovePermissionCommand,
  SendDurableExecutionCallbackFailureCommand,
  SendDurableExecutionCallbackHeartbeatCommand,
  SendDurableExecutionCallbackSuccessCommand,
  StopDurableExecutionCommand,
  TagResourceCommand,
  UntagResourceCommand,
  UpdateAliasCommand,
  UpdateEventSourceMappingCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
  UpdateFunctionEventInvokeConfigCommand,
  UpdateFunctionUrlConfigCommand
} from '@aws-sdk/client-lambda';
import { createSlatesAwsSdkHttpHandler } from '@slates/aws-sdk-http-handler';
import { lambdaApiError } from './errors';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface LambdaClientConfig {
  region: string;
  credentials: AwsCredentials;
}

let withoutUndefined = <T extends Record<string, any>>(input: T): T => {
  let out: Record<string, any> = {};

  for (let [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }

  return out as T;
};

let decodeBase64Blob = (value: unknown) =>
  typeof value === 'string' ? Buffer.from(value, 'base64') : value;

let normalizeCreateFunctionParams = (params: Record<string, any>) => {
  let out = { ...params };

  if (out.Code && typeof out.Code === 'object' && !Array.isArray(out.Code)) {
    out.Code = {
      ...out.Code,
      ZipFile: decodeBase64Blob(out.Code.ZipFile)
    };
  }

  return out;
};

let normalizeZipFileParams = (params: Record<string, any>) => ({
  ...params,
  ZipFile: decodeBase64Blob(params.ZipFile)
});

let normalizeLayerParams = (params: Record<string, any>) => {
  let out = { ...params };

  if (out.Content && typeof out.Content === 'object' && !Array.isArray(out.Content)) {
    out.Content = {
      ...out.Content,
      ZipFile: decodeBase64Blob(out.Content.ZipFile)
    };
  }

  return out;
};

let encodeJsonPayload = (value: unknown) =>
  value === undefined ? undefined : Buffer.from(JSON.stringify(value));

let decodeInvokePayload = (payload: unknown) => {
  if (payload === undefined || payload === null) {
    return payload;
  }

  let text =
    typeof payload === 'string'
      ? payload
      : Buffer.from(payload as Uint8Array).toString('utf8');

  if (!text) {
    return '';
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

let buildErrorObject = (params?: Record<string, any>) => {
  if (!params) return undefined;
  if (params.Error) return params.Error;

  let error = withoutUndefined({
    ErrorMessage: params.ErrorMessage,
    ErrorType: params.ErrorType,
    ErrorData: params.ErrorData,
    StackTrace: params.StackTrace
  });

  return Object.keys(error).length > 0 ? error : undefined;
};

export class LambdaClient {
  private client: AwsLambdaClient;

  constructor(config: LambdaClientConfig) {
    this.client = new AwsLambdaClient({
      region: config.region,
      credentials: withoutUndefined({
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
        sessionToken: config.credentials.sessionToken || undefined
      }),
      requestHandler: createSlatesAwsSdkHttpHandler()
    });
  }

  private async send<T>(operation: string, command: any): Promise<T> {
    try {
      return (await this.client.send(command)) as T;
    } catch (error) {
      throw lambdaApiError(error, operation);
    }
  }

  // ---- Function Management ----

  async createFunction(params: Record<string, any>): Promise<any> {
    return this.send(
      'CreateFunction',
      new CreateFunctionCommand(normalizeCreateFunctionParams(params) as any)
    );
  }

  async getFunction(functionName: string, qualifier?: string): Promise<any> {
    return this.send(
      'GetFunction',
      new GetFunctionCommand(
        withoutUndefined({ FunctionName: functionName, Qualifier: qualifier })
      )
    );
  }

  async getFunctionConfiguration(functionName: string, qualifier?: string): Promise<any> {
    return this.send(
      'GetFunctionConfiguration',
      new GetFunctionConfigurationCommand(
        withoutUndefined({ FunctionName: functionName, Qualifier: qualifier })
      )
    );
  }

  async updateFunctionCode(functionName: string, params: Record<string, any>): Promise<any> {
    return this.send(
      'UpdateFunctionCode',
      new UpdateFunctionCodeCommand(
        withoutUndefined({
          FunctionName: functionName,
          ...normalizeZipFileParams(params)
        }) as any
      )
    );
  }

  async updateFunctionConfiguration(
    functionName: string,
    params: Record<string, any>
  ): Promise<any> {
    return this.send(
      'UpdateFunctionConfiguration',
      new UpdateFunctionConfigurationCommand({
        FunctionName: functionName,
        ...params
      } as any)
    );
  }

  async deleteFunction(functionName: string, qualifier?: string): Promise<void> {
    await this.send(
      'DeleteFunction',
      new DeleteFunctionCommand(
        withoutUndefined({ FunctionName: functionName, Qualifier: qualifier })
      )
    );
  }

  async listFunctions(
    marker?: string,
    maxItems?: number,
    functionVersion?: string
  ): Promise<any> {
    return this.send(
      'ListFunctions',
      new ListFunctionsCommand(
        withoutUndefined({
          Marker: marker,
          MaxItems: maxItems,
          FunctionVersion: functionVersion
        }) as any
      )
    );
  }

  // ---- Invocation ----

  async invokeFunction(
    functionName: string,
    payload?: any,
    options?: {
      invocationType?: string;
      logType?: string;
      qualifier?: string;
      clientContext?: string;
      durableExecutionName?: string;
      tenantId?: string;
    }
  ): Promise<any> {
    let response: any = await this.send(
      'Invoke',
      new InvokeCommand(
        withoutUndefined({
          FunctionName: functionName,
          InvocationType: options?.invocationType,
          LogType: options?.logType,
          ClientContext: options?.clientContext,
          DurableExecutionName: options?.durableExecutionName,
          Payload: encodeJsonPayload(payload),
          Qualifier: options?.qualifier,
          TenantId: options?.tenantId
        }) as any
      )
    );

    return {
      ...response,
      Payload: decodeInvokePayload(response.Payload)
    };
  }

  // ---- Versions ----

  async publishVersion(functionName: string, params?: Record<string, any>): Promise<any> {
    return this.send(
      'PublishVersion',
      new PublishVersionCommand({
        FunctionName: functionName,
        ...(params || {})
      } as any)
    );
  }

  async listVersionsByFunction(
    functionName: string,
    marker?: string,
    maxItems?: number
  ): Promise<any> {
    return this.send(
      'ListVersionsByFunction',
      new ListVersionsByFunctionCommand(
        withoutUndefined({
          FunctionName: functionName,
          Marker: marker,
          MaxItems: maxItems
        })
      )
    );
  }

  // ---- Aliases ----

  async createAlias(functionName: string, params: Record<string, any>): Promise<any> {
    return this.send(
      'CreateAlias',
      new CreateAliasCommand({
        FunctionName: functionName,
        ...params
      } as any)
    );
  }

  async getAlias(functionName: string, aliasName: string): Promise<any> {
    return this.send(
      'GetAlias',
      new GetAliasCommand({ FunctionName: functionName, Name: aliasName })
    );
  }

  async updateAlias(
    functionName: string,
    aliasName: string,
    params: Record<string, any>
  ): Promise<any> {
    return this.send(
      'UpdateAlias',
      new UpdateAliasCommand({
        FunctionName: functionName,
        Name: aliasName,
        ...params
      } as any)
    );
  }

  async deleteAlias(functionName: string, aliasName: string): Promise<void> {
    await this.send(
      'DeleteAlias',
      new DeleteAliasCommand({ FunctionName: functionName, Name: aliasName })
    );
  }

  async listAliases(functionName: string, marker?: string, maxItems?: number): Promise<any> {
    return this.send(
      'ListAliases',
      new ListAliasesCommand(
        withoutUndefined({
          FunctionName: functionName,
          Marker: marker,
          MaxItems: maxItems
        })
      )
    );
  }

  // ---- Layers ----

  async publishLayerVersion(layerName: string, params: Record<string, any>): Promise<any> {
    return this.send(
      'PublishLayerVersion',
      new PublishLayerVersionCommand({
        LayerName: layerName,
        ...normalizeLayerParams(params)
      } as any)
    );
  }

  async getLayerVersion(layerName: string, versionNumber: number): Promise<any> {
    return this.send(
      'GetLayerVersion',
      new GetLayerVersionCommand({ LayerName: layerName, VersionNumber: versionNumber })
    );
  }

  async deleteLayerVersion(layerName: string, versionNumber: number): Promise<void> {
    await this.send(
      'DeleteLayerVersion',
      new DeleteLayerVersionCommand({ LayerName: layerName, VersionNumber: versionNumber })
    );
  }

  async listLayers(
    marker?: string,
    maxItems?: number,
    compatibleRuntime?: string
  ): Promise<any> {
    return this.send(
      'ListLayers',
      new ListLayersCommand(
        withoutUndefined({
          Marker: marker,
          MaxItems: maxItems,
          CompatibleRuntime: compatibleRuntime
        }) as any
      )
    );
  }

  async listLayerVersions(
    layerName: string,
    marker?: string,
    maxItems?: number
  ): Promise<any> {
    return this.send(
      'ListLayerVersions',
      new ListLayerVersionsCommand(
        withoutUndefined({
          LayerName: layerName,
          Marker: marker,
          MaxItems: maxItems
        })
      )
    );
  }

  // ---- Event Source Mappings ----

  async createEventSourceMapping(params: Record<string, any>): Promise<any> {
    return this.send(
      'CreateEventSourceMapping',
      new CreateEventSourceMappingCommand(params as any)
    );
  }

  async getEventSourceMapping(uuid: string): Promise<any> {
    return this.send(
      'GetEventSourceMapping',
      new GetEventSourceMappingCommand({ UUID: uuid })
    );
  }

  async updateEventSourceMapping(uuid: string, params: Record<string, any>): Promise<any> {
    return this.send(
      'UpdateEventSourceMapping',
      new UpdateEventSourceMappingCommand({ UUID: uuid, ...params } as any)
    );
  }

  async deleteEventSourceMapping(uuid: string): Promise<any> {
    return this.send(
      'DeleteEventSourceMapping',
      new DeleteEventSourceMappingCommand({ UUID: uuid })
    );
  }

  async listEventSourceMappings(
    functionName?: string,
    eventSourceArn?: string,
    marker?: string,
    maxItems?: number
  ): Promise<any> {
    return this.send(
      'ListEventSourceMappings',
      new ListEventSourceMappingsCommand(
        withoutUndefined({
          FunctionName: functionName,
          EventSourceArn: eventSourceArn,
          Marker: marker,
          MaxItems: maxItems
        })
      )
    );
  }

  // ---- Function URLs ----

  async createFunctionUrlConfig(
    functionName: string,
    params: Record<string, any>,
    qualifier?: string
  ): Promise<any> {
    return this.send(
      'CreateFunctionUrlConfig',
      new CreateFunctionUrlConfigCommand(
        withoutUndefined({
          FunctionName: functionName,
          Qualifier: qualifier,
          ...params
        }) as any
      )
    );
  }

  async getFunctionUrlConfig(functionName: string, qualifier?: string): Promise<any> {
    return this.send(
      'GetFunctionUrlConfig',
      new GetFunctionUrlConfigCommand(
        withoutUndefined({ FunctionName: functionName, Qualifier: qualifier })
      )
    );
  }

  async updateFunctionUrlConfig(
    functionName: string,
    params: Record<string, any>,
    qualifier?: string
  ): Promise<any> {
    return this.send(
      'UpdateFunctionUrlConfig',
      new UpdateFunctionUrlConfigCommand(
        withoutUndefined({
          FunctionName: functionName,
          Qualifier: qualifier,
          ...params
        }) as any
      )
    );
  }

  async deleteFunctionUrlConfig(functionName: string, qualifier?: string): Promise<void> {
    await this.send(
      'DeleteFunctionUrlConfig',
      new DeleteFunctionUrlConfigCommand(
        withoutUndefined({ FunctionName: functionName, Qualifier: qualifier })
      )
    );
  }

  // ---- Concurrency ----

  async putFunctionConcurrency(
    functionName: string,
    reservedConcurrentExecutions: number
  ): Promise<any> {
    return this.send(
      'PutFunctionConcurrency',
      new PutFunctionConcurrencyCommand({
        FunctionName: functionName,
        ReservedConcurrentExecutions: reservedConcurrentExecutions
      })
    );
  }

  async getFunctionConcurrency(functionName: string): Promise<any> {
    return this.send(
      'GetFunctionConcurrency',
      new GetFunctionConcurrencyCommand({ FunctionName: functionName })
    );
  }

  async deleteFunctionConcurrency(functionName: string): Promise<void> {
    await this.send(
      'DeleteFunctionConcurrency',
      new DeleteFunctionConcurrencyCommand({ FunctionName: functionName })
    );
  }

  async putProvisionedConcurrencyConfig(
    functionName: string,
    qualifier: string,
    provisionedConcurrentExecutions: number
  ): Promise<any> {
    return this.send(
      'PutProvisionedConcurrencyConfig',
      new PutProvisionedConcurrencyConfigCommand({
        FunctionName: functionName,
        Qualifier: qualifier,
        ProvisionedConcurrentExecutions: provisionedConcurrentExecutions
      })
    );
  }

  async getProvisionedConcurrencyConfig(
    functionName: string,
    qualifier: string
  ): Promise<any> {
    return this.send(
      'GetProvisionedConcurrencyConfig',
      new GetProvisionedConcurrencyConfigCommand({
        FunctionName: functionName,
        Qualifier: qualifier
      })
    );
  }

  async deleteProvisionedConcurrencyConfig(
    functionName: string,
    qualifier: string
  ): Promise<void> {
    await this.send(
      'DeleteProvisionedConcurrencyConfig',
      new DeleteProvisionedConcurrencyConfigCommand({
        FunctionName: functionName,
        Qualifier: qualifier
      })
    );
  }

  // ---- Permissions ----

  async addPermission(
    functionName: string,
    params: Record<string, any>,
    qualifier?: string
  ): Promise<any> {
    return this.send(
      'AddPermission',
      new AddPermissionCommand(
        withoutUndefined({
          FunctionName: functionName,
          Qualifier: qualifier,
          ...params
        }) as any
      )
    );
  }

  async removePermission(
    functionName: string,
    statementId: string,
    qualifier?: string,
    revisionId?: string
  ): Promise<void> {
    await this.send(
      'RemovePermission',
      new RemovePermissionCommand(
        withoutUndefined({
          FunctionName: functionName,
          StatementId: statementId,
          Qualifier: qualifier,
          RevisionId: revisionId
        })
      )
    );
  }

  async getPolicy(functionName: string, qualifier?: string): Promise<any> {
    return this.send(
      'GetPolicy',
      new GetPolicyCommand(
        withoutUndefined({ FunctionName: functionName, Qualifier: qualifier })
      )
    );
  }

  // ---- Tags ----

  async tagResource(arn: string, tags: Record<string, string>): Promise<void> {
    await this.send('TagResource', new TagResourceCommand({ Resource: arn, Tags: tags }));
  }

  async untagResource(arn: string, tagKeys: string[]): Promise<void> {
    await this.send(
      'UntagResource',
      new UntagResourceCommand({ Resource: arn, TagKeys: tagKeys })
    );
  }

  async listTags(arn: string): Promise<any> {
    return this.send('ListTags', new ListTagsCommand({ Resource: arn }));
  }

  // ---- Async Invocation Configuration ----

  async putFunctionEventInvokeConfig(
    functionName: string,
    params: Record<string, any>,
    qualifier?: string
  ): Promise<any> {
    return this.send(
      'PutFunctionEventInvokeConfig',
      new PutFunctionEventInvokeConfigCommand(
        withoutUndefined({
          FunctionName: functionName,
          Qualifier: qualifier,
          ...params
        }) as any
      )
    );
  }

  async getFunctionEventInvokeConfig(functionName: string, qualifier?: string): Promise<any> {
    return this.send(
      'GetFunctionEventInvokeConfig',
      new GetFunctionEventInvokeConfigCommand(
        withoutUndefined({ FunctionName: functionName, Qualifier: qualifier })
      )
    );
  }

  async deleteFunctionEventInvokeConfig(
    functionName: string,
    qualifier?: string
  ): Promise<void> {
    await this.send(
      'DeleteFunctionEventInvokeConfig',
      new DeleteFunctionEventInvokeConfigCommand(
        withoutUndefined({ FunctionName: functionName, Qualifier: qualifier })
      )
    );
  }

  async updateFunctionEventInvokeConfig(
    functionName: string,
    params: Record<string, any>,
    qualifier?: string
  ): Promise<any> {
    return this.send(
      'UpdateFunctionEventInvokeConfig',
      new UpdateFunctionEventInvokeConfigCommand(
        withoutUndefined({
          FunctionName: functionName,
          Qualifier: qualifier,
          ...params
        }) as any
      )
    );
  }

  async listFunctionEventInvokeConfigs(
    functionName: string,
    marker?: string,
    maxItems?: number
  ): Promise<any> {
    return this.send(
      'ListFunctionEventInvokeConfigs',
      new ListFunctionEventInvokeConfigsCommand(
        withoutUndefined({
          FunctionName: functionName,
          Marker: marker,
          MaxItems: maxItems
        })
      )
    );
  }

  // ---- Runtime Management ----

  async getRuntimeManagementConfig(functionName: string, qualifier?: string): Promise<any> {
    return this.send(
      'GetRuntimeManagementConfig',
      new GetRuntimeManagementConfigCommand(
        withoutUndefined({ FunctionName: functionName, Qualifier: qualifier })
      )
    );
  }

  async putRuntimeManagementConfig(
    functionName: string,
    params: Record<string, any>,
    qualifier?: string
  ): Promise<any> {
    return this.send(
      'PutRuntimeManagementConfig',
      new PutRuntimeManagementConfigCommand(
        withoutUndefined({
          FunctionName: functionName,
          Qualifier: qualifier,
          ...params
        }) as any
      )
    );
  }

  // ---- Recursive Loop Detection ----

  async getFunctionRecursionConfig(functionName: string): Promise<any> {
    return this.send(
      'GetFunctionRecursionConfig',
      new GetFunctionRecursionConfigCommand({ FunctionName: functionName })
    );
  }

  async putFunctionRecursionConfig(
    functionName: string,
    recursiveLoop: 'Allow' | 'Terminate'
  ): Promise<any> {
    return this.send(
      'PutFunctionRecursionConfig',
      new PutFunctionRecursionConfigCommand({
        FunctionName: functionName,
        RecursiveLoop: recursiveLoop
      })
    );
  }

  // ---- Durable Executions ----

  async getDurableExecution(durableExecutionArn: string): Promise<any> {
    return this.send(
      'GetDurableExecution',
      new GetDurableExecutionCommand({ DurableExecutionArn: durableExecutionArn })
    );
  }

  async getDurableExecutionHistory(
    durableExecutionArn: string,
    marker?: string,
    maxItems?: number
  ): Promise<any> {
    return this.send(
      'GetDurableExecutionHistory',
      new GetDurableExecutionHistoryCommand(
        withoutUndefined({
          DurableExecutionArn: durableExecutionArn,
          Marker: marker,
          MaxItems: maxItems
        })
      )
    );
  }

  async getDurableExecutionState(
    durableExecutionArn: string,
    checkpointToken?: string,
    marker?: string,
    maxItems?: number
  ): Promise<any> {
    return this.send(
      'GetDurableExecutionState',
      new GetDurableExecutionStateCommand(
        withoutUndefined({
          DurableExecutionArn: durableExecutionArn,
          CheckpointToken: checkpointToken,
          Marker: marker,
          MaxItems: maxItems
        }) as any
      )
    );
  }

  async listDurableExecutionsByFunction(
    functionName: string,
    statuses?: string,
    marker?: string,
    maxItems?: number
  ): Promise<any> {
    return this.send(
      'ListDurableExecutionsByFunction',
      new ListDurableExecutionsByFunctionCommand(
        withoutUndefined({
          FunctionName: functionName,
          Statuses: statuses ? [statuses] : undefined,
          Marker: marker,
          MaxItems: maxItems
        }) as any
      )
    );
  }

  async stopDurableExecution(
    durableExecutionArn: string,
    params?: Record<string, any>
  ): Promise<any> {
    return this.send(
      'StopDurableExecution',
      new StopDurableExecutionCommand(
        withoutUndefined({
          DurableExecutionArn: durableExecutionArn,
          Error: buildErrorObject(params)
        }) as any
      )
    );
  }

  async sendDurableExecutionCallbackSuccess(callbackId: string, result?: any): Promise<any> {
    return this.send(
      'SendDurableExecutionCallbackSuccess',
      new SendDurableExecutionCallbackSuccessCommand({
        CallbackId: callbackId,
        Result: encodeJsonPayload(result || {})
      } as any)
    );
  }

  async sendDurableExecutionCallbackFailure(
    callbackId: string,
    params?: Record<string, any>
  ): Promise<any> {
    return this.send(
      'SendDurableExecutionCallbackFailure',
      new SendDurableExecutionCallbackFailureCommand(
        withoutUndefined({
          CallbackId: callbackId,
          Error: buildErrorObject(params)
        }) as any
      )
    );
  }

  async sendDurableExecutionCallbackHeartbeat(callbackId: string): Promise<any> {
    return this.send(
      'SendDurableExecutionCallbackHeartbeat',
      new SendDurableExecutionCallbackHeartbeatCommand({ CallbackId: callbackId })
    );
  }

  // ---- Account Settings ----

  async getAccountSettings(): Promise<any> {
    return this.send('GetAccountSettings', new GetAccountSettingsCommand({}));
  }
}
