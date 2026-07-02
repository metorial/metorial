import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudFunctionsActionScopes } from '../scopes';
import { spec } from '../spec';

let eventFilterInputSchema = z.object({
  attribute: z.string().describe('CloudEvent attribute name (e.g. "type", "bucket")'),
  value: z.string().describe('Exact value to match'),
  operator: z.string().optional().describe('Comparison operator (default: exact match)')
});

export let createFunction = SlateTool.create(spec, {
  name: 'Create Function',
  key: 'create_function',
  description: `Create and deploy a new Cloud Function. Configure the runtime, entry point, source code location, memory, timeout, environment variables, and event triggers. Source code must be uploaded to a Cloud Storage bucket or referenced from a Cloud Source Repository. Returns a long-running operation that can be polled for completion.`,
  instructions: [
    'Use "generate_upload_url" first to get a signed URL for uploading source code, then reference the storage source in the build config.',
    'For HTTP-triggered functions, omit the eventTrigger field. For event-driven functions, specify the eventTrigger with the appropriate eventType and filters.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleCloudFunctionsActionScopes.createFunction)
  .input(
    z.object({
      functionId: z
        .string()
        .describe('Function name (4-63 chars, lowercase letters, numbers, hyphens)'),
      location: z
        .string()
        .optional()
        .describe('Region to deploy the function to. Defaults to configured region.'),
      description: z.string().optional().describe('Description of the function'),
      labels: z
        .record(z.string(), z.string())
        .optional()
        .describe('Labels to apply to the function'),
      environment: z
        .enum(['GEN_1', 'GEN_2'])
        .optional()
        .describe('Function generation. Defaults to GEN_2.'),
      runtime: z
        .string()
        .describe(
          'Runtime environment (e.g. "nodejs20", "python312", "go122", "java17", "dotnet8", "ruby33")'
        ),
      entryPoint: z.string().describe('Name of the function to execute (entry point)'),
      sourceStorageBucket: z
        .string()
        .optional()
        .describe('Cloud Storage bucket containing the source archive'),
      sourceStorageObject: z
        .string()
        .optional()
        .describe('Cloud Storage object path for the source archive'),
      sourceUploadUrl: z
        .string()
        .optional()
        .describe('Upload URL from generateUploadUrl for the source code'),
      sourceRepoUrl: z.string().optional().describe('Cloud Source Repository URL'),
      sourceRepoBranch: z.string().optional().describe('Branch name in the source repository'),
      buildEnvironmentVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Build-time environment variables'),
      timeoutSeconds: z
        .number()
        .optional()
        .describe(
          'Function execution timeout in seconds (max 540 for Gen 1, max 3600 for Gen 2)'
        ),
      availableMemory: z
        .string()
        .optional()
        .describe('Memory to allocate (e.g. "256Mi", "1Gi", "2Gi")'),
      availableCpu: z.string().optional().describe('CPU to allocate (e.g. "0.167", "1", "2")'),
      maxInstanceCount: z.number().optional().describe('Maximum concurrent instances'),
      minInstanceCount: z.number().optional().describe('Minimum warm instances to keep ready'),
      environmentVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Runtime environment variables'),
      serviceAccountEmail: z
        .string()
        .optional()
        .describe('Service account email for the function to run as'),
      ingressSettings: z
        .enum(['ALLOW_ALL', 'ALLOW_INTERNAL_ONLY', 'ALLOW_INTERNAL_AND_GCLB'])
        .optional()
        .describe('Ingress traffic control'),
      vpcConnector: z.string().optional().describe('VPC connector resource name for egress'),
      vpcConnectorEgressSettings: z
        .enum(['PRIVATE_RANGES_ONLY', 'ALL_TRAFFIC'])
        .optional()
        .describe('Egress settings for VPC connector'),
      allTrafficOnLatestRevision: z
        .boolean()
        .optional()
        .describe('Whether to route all traffic to latest revision'),
      eventTrigger: z
        .object({
          eventType: z
            .string()
            .describe(
              'Type of event to trigger the function (e.g. "google.cloud.storage.object.v1.finalized")'
            ),
          triggerRegion: z.string().optional().describe('Region for the event trigger'),
          eventFilters: z
            .array(eventFilterInputSchema)
            .optional()
            .describe('Filters for event matching'),
          pubsubTopic: z.string().optional().describe('Pub/Sub topic resource name'),
          retryPolicy: z
            .enum(['RETRY_POLICY_DO_NOT_RETRY', 'RETRY_POLICY_RETRY'])
            .optional()
            .describe('Retry policy for failed executions'),
          serviceAccountEmail: z
            .string()
            .optional()
            .describe('Service account for the event trigger')
        })
        .optional()
        .describe('Event trigger configuration. Omit for HTTP-triggered functions.')
    })
  )
  .output(
    z.object({
      operationName: z.string().describe('Long-running operation name to poll for completion'),
      done: z.boolean().describe('Whether the operation has completed'),
      functionName: z
        .string()
        .optional()
        .describe('Created function resource name if completed')
    })
  )
  .handleInvocation(async ctx => {
    let region = ctx.input.location || ctx.config.region;
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region
    });
    let functionName = client.functionName(ctx.input.functionId);

    let source: Record<string, any> = {};
    if (ctx.input.sourceUploadUrl) {
      source.storageSource = { sourceUploadUrl: ctx.input.sourceUploadUrl };
    } else if (ctx.input.sourceStorageBucket && ctx.input.sourceStorageObject) {
      source.storageSource = {
        bucket: ctx.input.sourceStorageBucket,
        object: ctx.input.sourceStorageObject
      };
    } else if (ctx.input.sourceRepoUrl) {
      source.repoSource = {
        url: ctx.input.sourceRepoUrl,
        branchName: ctx.input.sourceRepoBranch
      };
    }

    let buildConfig: Record<string, any> = {
      runtime: ctx.input.runtime,
      entryPoint: ctx.input.entryPoint,
      source
    };
    if (ctx.input.buildEnvironmentVariables) {
      buildConfig.environmentVariables = ctx.input.buildEnvironmentVariables;
    }

    let serviceConfig: Record<string, any> = {};
    if (ctx.input.timeoutSeconds !== undefined)
      serviceConfig.timeoutSeconds = ctx.input.timeoutSeconds;
    if (ctx.input.availableMemory) serviceConfig.availableMemory = ctx.input.availableMemory;
    if (ctx.input.availableCpu) serviceConfig.availableCpu = ctx.input.availableCpu;
    if (ctx.input.maxInstanceCount !== undefined)
      serviceConfig.maxInstanceCount = ctx.input.maxInstanceCount;
    if (ctx.input.minInstanceCount !== undefined)
      serviceConfig.minInstanceCount = ctx.input.minInstanceCount;
    if (ctx.input.environmentVariables)
      serviceConfig.environmentVariables = ctx.input.environmentVariables;
    if (ctx.input.serviceAccountEmail)
      serviceConfig.serviceAccountEmail = ctx.input.serviceAccountEmail;
    if (ctx.input.ingressSettings) serviceConfig.ingressSettings = ctx.input.ingressSettings;
    if (ctx.input.vpcConnector) serviceConfig.vpcConnector = ctx.input.vpcConnector;
    if (ctx.input.vpcConnectorEgressSettings)
      serviceConfig.vpcConnectorEgressSettings = ctx.input.vpcConnectorEgressSettings;
    if (ctx.input.allTrafficOnLatestRevision !== undefined)
      serviceConfig.allTrafficOnLatestRevision = ctx.input.allTrafficOnLatestRevision;

    let body: Record<string, any> = {
      name: functionName,
      buildConfig,
      serviceConfig
    };
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.labels) body.labels = ctx.input.labels;
    if (ctx.input.environment) body.environment = ctx.input.environment;
    if (ctx.input.eventTrigger) body.eventTrigger = ctx.input.eventTrigger;

    ctx.progress(`Creating function **${ctx.input.functionId}**...`);

    let operation = await client.createFunction({
      functionId: ctx.input.functionId,
      body
    });

    return {
      output: {
        operationName: operation.name,
        done: operation.done || false,
        functionName: operation.response?.name
      },
      message: `Function **${ctx.input.functionId}** creation initiated. Operation: \`${operation.name}\`. ${operation.done ? 'Deployment complete.' : 'Deployment in progress - use the operation name to check status.'}`
    };
  })
  .build();
