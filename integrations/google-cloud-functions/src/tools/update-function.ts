import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudFunctionsActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateFunction = SlateTool.create(spec, {
  name: 'Update Function',
  key: 'update_function',
  description: `Update an existing Cloud Function's configuration. Modify runtime settings, memory, timeout, environment variables, labels, description, scaling limits, ingress/egress settings, and more. Only the fields you provide will be updated. Returns a long-running operation.`,
  instructions: [
    'Only provide the fields you want to change. Unspecified fields will remain unchanged.',
    'To update source code, first use "generate_upload_url" then provide the new sourceUploadUrl.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleCloudFunctionsActionScopes.updateFunction)
  .input(
    z.object({
      functionName: z
        .string()
        .describe('Short function name or fully qualified resource name'),
      location: z
        .string()
        .optional()
        .describe('Region of the function. Only needed with short function names.'),
      description: z.string().optional().describe('New description'),
      labels: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated labels (replaces all labels)'),
      runtime: z.string().optional().describe('New runtime (e.g. "nodejs20", "python312")'),
      entryPoint: z.string().optional().describe('New entry point function name'),
      sourceUploadUrl: z
        .string()
        .optional()
        .describe('New source upload URL from generateUploadUrl'),
      sourceStorageBucket: z
        .string()
        .optional()
        .describe('New Cloud Storage bucket for source'),
      sourceStorageObject: z
        .string()
        .optional()
        .describe('New Cloud Storage object for source'),
      buildEnvironmentVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated build-time environment variables'),
      timeoutSeconds: z.number().optional().describe('New execution timeout in seconds'),
      availableMemory: z
        .string()
        .optional()
        .describe('New memory allocation (e.g. "256Mi", "1Gi")'),
      availableCpu: z.string().optional().describe('New CPU allocation (e.g. "1", "2")'),
      maxInstanceCount: z.number().optional().describe('New maximum instance count'),
      minInstanceCount: z.number().optional().describe('New minimum instance count'),
      environmentVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated runtime environment variables'),
      serviceAccountEmail: z.string().optional().describe('New service account email'),
      ingressSettings: z
        .enum(['ALLOW_ALL', 'ALLOW_INTERNAL_ONLY', 'ALLOW_INTERNAL_AND_GCLB'])
        .optional()
        .describe('New ingress setting'),
      vpcConnector: z.string().optional().describe('New VPC connector'),
      vpcConnectorEgressSettings: z
        .enum(['PRIVATE_RANGES_ONLY', 'ALL_TRAFFIC'])
        .optional()
        .describe('New VPC egress setting'),
      allTrafficOnLatestRevision: z
        .boolean()
        .optional()
        .describe('Route all traffic to latest revision')
    })
  )
  .output(
    z.object({
      operationName: z.string().describe('Long-running operation name'),
      done: z.boolean().describe('Whether the operation completed immediately')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.input.location || ctx.config.region
    });

    let name: string;
    if (ctx.input.functionName.startsWith('projects/')) {
      name = ctx.input.functionName;
    } else {
      let region = ctx.input.location || ctx.config.region;
      name = `projects/${ctx.config.projectId}/locations/${region}/functions/${ctx.input.functionName}`;
    }

    let updateMaskFields: string[] = [];
    let body: Record<string, any> = { name };

    if (ctx.input.description !== undefined) {
      body.description = ctx.input.description;
      updateMaskFields.push('description');
    }
    if (ctx.input.labels !== undefined) {
      body.labels = ctx.input.labels;
      updateMaskFields.push('labels');
    }

    let buildConfig: Record<string, any> = {};
    let hasBuildConfig = false;

    if (ctx.input.runtime) {
      buildConfig.runtime = ctx.input.runtime;
      updateMaskFields.push('buildConfig.runtime');
      hasBuildConfig = true;
    }
    if (ctx.input.entryPoint) {
      buildConfig.entryPoint = ctx.input.entryPoint;
      updateMaskFields.push('buildConfig.entryPoint');
      hasBuildConfig = true;
    }
    if (ctx.input.sourceUploadUrl) {
      buildConfig.source = {
        storageSource: { sourceUploadUrl: ctx.input.sourceUploadUrl }
      };
      updateMaskFields.push('buildConfig.source');
      hasBuildConfig = true;
    } else if (ctx.input.sourceStorageBucket && ctx.input.sourceStorageObject) {
      buildConfig.source = {
        storageSource: {
          bucket: ctx.input.sourceStorageBucket,
          object: ctx.input.sourceStorageObject
        }
      };
      updateMaskFields.push('buildConfig.source');
      hasBuildConfig = true;
    }
    if (ctx.input.buildEnvironmentVariables) {
      buildConfig.environmentVariables = ctx.input.buildEnvironmentVariables;
      updateMaskFields.push('buildConfig.environmentVariables');
      hasBuildConfig = true;
    }

    if (hasBuildConfig) {
      body.buildConfig = buildConfig;
    }

    let serviceConfig: Record<string, any> = {};
    let hasServiceConfig = false;

    if (ctx.input.timeoutSeconds !== undefined) {
      serviceConfig.timeoutSeconds = ctx.input.timeoutSeconds;
      updateMaskFields.push('serviceConfig.timeoutSeconds');
      hasServiceConfig = true;
    }
    if (ctx.input.availableMemory) {
      serviceConfig.availableMemory = ctx.input.availableMemory;
      updateMaskFields.push('serviceConfig.availableMemory');
      hasServiceConfig = true;
    }
    if (ctx.input.availableCpu) {
      serviceConfig.availableCpu = ctx.input.availableCpu;
      updateMaskFields.push('serviceConfig.availableCpu');
      hasServiceConfig = true;
    }
    if (ctx.input.maxInstanceCount !== undefined) {
      serviceConfig.maxInstanceCount = ctx.input.maxInstanceCount;
      updateMaskFields.push('serviceConfig.maxInstanceCount');
      hasServiceConfig = true;
    }
    if (ctx.input.minInstanceCount !== undefined) {
      serviceConfig.minInstanceCount = ctx.input.minInstanceCount;
      updateMaskFields.push('serviceConfig.minInstanceCount');
      hasServiceConfig = true;
    }
    if (ctx.input.environmentVariables) {
      serviceConfig.environmentVariables = ctx.input.environmentVariables;
      updateMaskFields.push('serviceConfig.environmentVariables');
      hasServiceConfig = true;
    }
    if (ctx.input.serviceAccountEmail) {
      serviceConfig.serviceAccountEmail = ctx.input.serviceAccountEmail;
      updateMaskFields.push('serviceConfig.serviceAccountEmail');
      hasServiceConfig = true;
    }
    if (ctx.input.ingressSettings) {
      serviceConfig.ingressSettings = ctx.input.ingressSettings;
      updateMaskFields.push('serviceConfig.ingressSettings');
      hasServiceConfig = true;
    }
    if (ctx.input.vpcConnector) {
      serviceConfig.vpcConnector = ctx.input.vpcConnector;
      updateMaskFields.push('serviceConfig.vpcConnector');
      hasServiceConfig = true;
    }
    if (ctx.input.vpcConnectorEgressSettings) {
      serviceConfig.vpcConnectorEgressSettings = ctx.input.vpcConnectorEgressSettings;
      updateMaskFields.push('serviceConfig.vpcConnectorEgressSettings');
      hasServiceConfig = true;
    }
    if (ctx.input.allTrafficOnLatestRevision !== undefined) {
      serviceConfig.allTrafficOnLatestRevision = ctx.input.allTrafficOnLatestRevision;
      updateMaskFields.push('serviceConfig.allTrafficOnLatestRevision');
      hasServiceConfig = true;
    }

    if (hasServiceConfig) {
      body.serviceConfig = serviceConfig;
    }

    if (updateMaskFields.length === 0) {
      throw new Error('No fields to update. Provide at least one field to change.');
    }

    ctx.progress(`Updating function **${ctx.input.functionName}**...`);

    let operation = await client.updateFunction({
      name,
      updateMask: updateMaskFields.join(','),
      body
    });

    return {
      output: {
        operationName: operation.name,
        done: operation.done || false
      },
      message: `Function **${ctx.input.functionName}** update initiated. Updated fields: ${updateMaskFields.join(', ')}. ${operation.done ? 'Update complete.' : 'Update in progress - poll the operation for status.'}`
    };
  })
  .build();
