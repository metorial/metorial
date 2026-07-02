import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient, resourceApiPaths } from '../lib/client';
import { spec } from '../spec';

let supportedTypes = Object.keys(resourceApiPaths);

export let deleteResource = SlateTool.create(spec, {
  name: 'Delete Resource',
  key: 'delete_resource',
  description: `Delete a Kubernetes resource by type and name. Supports all standard resource types.
Optionally set the propagation policy to control how dependent resources are cleaned up.`,
  instructions: [
    'propagationPolicy "Foreground" deletes dependents before the owner.',
    'propagationPolicy "Background" deletes the owner immediately and dependents asynchronously.',
    'propagationPolicy "Orphan" leaves dependents untouched.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      resourceType: z
        .string()
        .describe(`Resource type to delete. Supported: ${supportedTypes.join(', ')}`),
      resourceName: z.string().describe('Name of the resource to delete'),
      namespace: z
        .string()
        .optional()
        .describe('Namespace of the resource. Ignored for cluster-scoped resources.'),
      propagationPolicy: z
        .enum(['Foreground', 'Background', 'Orphan'])
        .optional()
        .describe('How to handle dependent resources')
    })
  )
  .output(
    z.object({
      resourceType: z.string().describe('Type of the deleted resource'),
      resourceName: z.string().describe('Name of the deleted resource'),
      resourceNamespace: z.string().optional().describe('Namespace of the deleted resource'),
      deleted: z.boolean().describe('Whether the deletion was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);

    await client.deleteResource(
      ctx.input.resourceType,
      ctx.input.resourceName,
      ctx.input.namespace,
      ctx.input.propagationPolicy
    );

    return {
      output: {
        resourceType: ctx.input.resourceType,
        resourceName: ctx.input.resourceName,
        resourceNamespace: ctx.input.namespace,
        deleted: true
      },
      message: `Deleted ${ctx.input.resourceType.slice(0, -1)} **${ctx.input.resourceName}**${ctx.input.namespace ? ` from namespace **${ctx.input.namespace}**` : ''}.`
    };
  })
  .build();
