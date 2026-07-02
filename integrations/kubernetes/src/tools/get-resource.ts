import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient, resourceApiPaths } from '../lib/client';
import { spec } from '../spec';

let supportedTypes = Object.keys(resourceApiPaths);

export let getResource = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description: `Retrieve the full details of a specific Kubernetes resource by name and type. Returns the complete resource manifest including metadata, spec, and status.
Useful for inspecting the current state and configuration of any resource.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .string()
        .describe(`Resource type to get. Supported: ${supportedTypes.join(', ')}`),
      resourceName: z.string().describe('Name of the resource to retrieve'),
      namespace: z
        .string()
        .optional()
        .describe('Namespace of the resource. Ignored for cluster-scoped resources.')
    })
  )
  .output(
    z.object({
      apiVersion: z.string().describe('API version of the resource'),
      kind: z.string().describe('Kind of the resource'),
      resourceName: z.string().describe('Name of the resource'),
      resourceNamespace: z.string().optional().describe('Namespace of the resource'),
      resourceUid: z.string().optional().describe('UID of the resource'),
      resourceVersion: z
        .string()
        .optional()
        .describe('Resource version for optimistic concurrency'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      labels: z.record(z.string(), z.string()).optional().describe('Resource labels'),
      annotations: z
        .record(z.string(), z.string())
        .optional()
        .describe('Resource annotations'),
      spec: z.any().optional().describe('Resource spec'),
      status: z.any().optional().describe('Resource status'),
      data: z.any().optional().describe('Resource data (for ConfigMaps, Secrets, etc.)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);

    let resource = await client.getResource(
      ctx.input.resourceType,
      ctx.input.resourceName,
      ctx.input.namespace
    );

    return {
      output: {
        apiVersion: resource.apiVersion,
        kind: resource.kind,
        resourceName: resource.metadata.name,
        resourceNamespace: resource.metadata.namespace,
        resourceUid: resource.metadata.uid,
        resourceVersion: resource.metadata.resourceVersion,
        createdAt: resource.metadata.creationTimestamp,
        labels: resource.metadata.labels,
        annotations: resource.metadata.annotations,
        spec: resource.spec,
        status: resource.status,
        data: resource.data
      },
      message: `Retrieved **${resource.kind}/${resource.metadata.name}**${resource.metadata.namespace ? ` in namespace **${resource.metadata.namespace}**` : ''}.`
    };
  })
  .build();
