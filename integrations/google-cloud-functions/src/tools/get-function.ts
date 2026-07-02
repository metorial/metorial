import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudFunctionsActionScopes } from '../scopes';
import { spec } from '../spec';

let eventFilterSchema = z.object({
  attribute: z.string(),
  value: z.string(),
  operator: z.string().optional()
});

let stateMessageSchema = z.object({
  severity: z.string().optional(),
  type: z.string().optional(),
  message: z.string().optional()
});

export let getFunction = SlateTool.create(spec, {
  name: 'Get Function',
  key: 'get_function',
  description: `Retrieve full details of a specific Cloud Function including its build configuration, service configuration, event trigger settings, state, and deployment URL. Use a short function name or a fully qualified resource name.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudFunctionsActionScopes.getFunction)
  .input(
    z.object({
      functionName: z
        .string()
        .describe(
          'Short function name (e.g. "my-function") or fully qualified resource name (e.g. "projects/my-project/locations/us-central1/functions/my-function")'
        ),
      location: z
        .string()
        .optional()
        .describe(
          'Region where the function is deployed. Only needed when using a short function name. Defaults to configured region.'
        )
    })
  )
  .output(
    z.object({
      name: z.string().describe('Fully qualified resource name'),
      functionName: z.string().describe('Short function name'),
      description: z.string().optional().describe('User-provided description'),
      state: z.string().describe('Current state (ACTIVE, DEPLOYING, FAILED, etc.)'),
      stateMessages: z
        .array(stateMessageSchema)
        .optional()
        .describe('Informational messages about function state'),
      environment: z.string().optional().describe('GEN_1 or GEN_2'),
      url: z.string().optional().describe('Deployed HTTP URL endpoint'),
      createTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().describe('Last update timestamp'),
      labels: z.record(z.string(), z.string()).optional().describe('User-defined labels'),
      runtime: z.string().optional().describe('Runtime environment'),
      entryPoint: z.string().optional().describe('Function entry point'),
      sourceUploadUrl: z.string().optional().describe('Source upload URL if applicable'),
      buildEnvironmentVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Build-time environment variables'),
      serviceAccountEmail: z
        .string()
        .optional()
        .describe('Service account used by the function'),
      timeoutSeconds: z.number().optional().describe('Function execution timeout'),
      availableMemory: z.string().optional().describe('Memory allocated to the function'),
      availableCpu: z.string().optional().describe('CPU allocated to the function'),
      maxInstanceCount: z.number().optional().describe('Maximum number of instances'),
      minInstanceCount: z.number().optional().describe('Minimum number of instances'),
      environmentVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Runtime environment variables'),
      ingressSettings: z
        .string()
        .optional()
        .describe('Ingress settings (ALLOW_ALL, ALLOW_INTERNAL_ONLY, etc.)'),
      vpcConnector: z.string().optional().describe('VPC connector resource name'),
      eventTrigger: z
        .object({
          eventType: z.string().optional(),
          triggerRegion: z.string().optional(),
          pubsubTopic: z.string().optional(),
          eventFilters: z.array(eventFilterSchema).optional(),
          retryPolicy: z.string().optional(),
          serviceAccountEmail: z.string().optional()
        })
        .optional()
        .describe('Event trigger configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.input.location || ctx.config.region
    });

    let fn: any;
    if (ctx.input.functionName.startsWith('projects/')) {
      fn = await client.getFunction(ctx.input.functionName);
    } else {
      fn = await client.getFunctionByName(ctx.input.functionName, ctx.input.location);
    }

    let nameParts = (fn.name || '').split('/');
    let shortName = nameParts[nameParts.length - 1] || fn.name;

    return {
      output: {
        name: fn.name,
        functionName: shortName,
        description: fn.description,
        state: fn.state || 'UNKNOWN',
        stateMessages: fn.stateMessages,
        environment: fn.environment,
        url: fn.url || fn.serviceConfig?.uri,
        createTime: fn.createTime,
        updateTime: fn.updateTime,
        labels: fn.labels,
        runtime: fn.buildConfig?.runtime,
        entryPoint: fn.buildConfig?.entryPoint,
        sourceUploadUrl: fn.buildConfig?.source?.storageSource?.sourceUploadUrl,
        buildEnvironmentVariables: fn.buildConfig?.environmentVariables,
        serviceAccountEmail: fn.serviceConfig?.serviceAccountEmail,
        timeoutSeconds: fn.serviceConfig?.timeoutSeconds,
        availableMemory: fn.serviceConfig?.availableMemory,
        availableCpu: fn.serviceConfig?.availableCpu,
        maxInstanceCount: fn.serviceConfig?.maxInstanceCount,
        minInstanceCount: fn.serviceConfig?.minInstanceCount,
        environmentVariables: fn.serviceConfig?.environmentVariables,
        ingressSettings: fn.serviceConfig?.ingressSettings,
        vpcConnector: fn.serviceConfig?.vpcConnector,
        eventTrigger: fn.eventTrigger
          ? {
              eventType: fn.eventTrigger.eventType,
              triggerRegion: fn.eventTrigger.triggerRegion,
              pubsubTopic: fn.eventTrigger.pubsubTopic,
              eventFilters: fn.eventTrigger.eventFilters,
              retryPolicy: fn.eventTrigger.retryPolicy,
              serviceAccountEmail: fn.eventTrigger.serviceAccountEmail
            }
          : undefined
      },
      message: `Function **${shortName}** is in **${fn.state || 'UNKNOWN'}** state.${fn.url ? ` URL: ${fn.url}` : ''}${fn.buildConfig?.runtime ? ` Runtime: ${fn.buildConfig.runtime}.` : ''}`
    };
  })
  .build();
