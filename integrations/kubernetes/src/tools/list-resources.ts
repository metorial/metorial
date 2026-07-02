import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient, resourceApiPaths } from '../lib/client';
import { spec } from '../spec';

let supportedTypes = Object.keys(resourceApiPaths);

export let listResources = SlateTool.create(spec, {
  name: 'List Resources',
  key: 'list_resources',
  description: `List Kubernetes resources of a given type. Supports all standard resource types including pods, deployments, services, configmaps, secrets, namespaces, nodes, and more.
Use **labelSelector** and **fieldSelector** to filter results. Pagination is supported via **limit** and **continueToken**.`,
  instructions: [
    'Use labelSelector with the format "key=value" or "key in (val1,val2)" to filter by labels.',
    'Use fieldSelector with the format "metadata.name=my-name" to filter by fields.',
    'For cluster-scoped resources (nodes, namespaces, clusterroles, etc.), the namespace field is ignored.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .string()
        .describe(`Resource type to list. Supported: ${supportedTypes.join(', ')}`),
      namespace: z
        .string()
        .optional()
        .describe('Namespace to list resources from. Ignored for cluster-scoped resources.'),
      labelSelector: z
        .string()
        .optional()
        .describe('Label selector to filter resources (e.g. "app=nginx,tier=frontend")'),
      fieldSelector: z
        .string()
        .optional()
        .describe('Field selector to filter resources (e.g. "metadata.name=my-pod")'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      continueToken: z.string().optional().describe('Continuation token for paginated results')
    })
  )
  .output(
    z.object({
      resourceType: z.string().describe('The resource type that was listed'),
      namespace: z
        .string()
        .optional()
        .describe('The namespace the resources were listed from'),
      resourceCount: z.number().describe('Number of resources returned'),
      continueToken: z.string().optional().describe('Token to fetch the next page of results'),
      resources: z
        .array(
          z.object({
            resourceName: z.string().describe('Name of the resource'),
            resourceNamespace: z.string().optional().describe('Namespace of the resource'),
            resourceUid: z.string().optional().describe('UID of the resource'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            labels: z.record(z.string(), z.string()).optional().describe('Resource labels'),
            status: z.any().optional().describe('Resource status (varies by type)')
          })
        )
        .describe('List of resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);

    let result = await client.listResources(ctx.input.resourceType, {
      namespace: ctx.input.namespace,
      labelSelector: ctx.input.labelSelector,
      fieldSelector: ctx.input.fieldSelector,
      limit: ctx.input.limit,
      continueToken: ctx.input.continueToken
    });

    let resources = result.items.map(item => ({
      resourceName: item.metadata.name,
      resourceNamespace: item.metadata.namespace,
      resourceUid: item.metadata.uid,
      createdAt: item.metadata.creationTimestamp,
      labels: item.metadata.labels,
      status: item.status
    }));

    return {
      output: {
        resourceType: ctx.input.resourceType,
        namespace: ctx.input.namespace,
        resourceCount: resources.length,
        continueToken: result.metadata.continue,
        resources
      },
      message: `Listed **${resources.length}** ${ctx.input.resourceType}${ctx.input.namespace ? ` in namespace **${ctx.input.namespace}**` : ''}.${result.metadata.continue ? ' More results available with continue token.' : ''}`
    };
  })
  .build();
