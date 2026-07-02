import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient } from '../lib/client';
import { kubernetesServiceError } from '../lib/errors';
import { spec } from '../spec';

export let applyResource = SlateTool.create(spec, {
  name: 'Apply Resource',
  key: 'apply_resource',
  description: `Apply a Kubernetes resource manifest (similar to \`kubectl apply\`). Creates the resource if it doesn't exist, or updates it if it does.
Accepts a full resource manifest as a JSON object. The kind, apiVersion, and metadata.name are required.`,
  instructions: [
    'The manifest must include apiVersion, kind, and metadata.name at minimum.',
    'If the resource already exists, it will be updated with the provided manifest (resourceVersion is handled automatically).',
    "Use this tool for any resource type — it determines the correct API endpoint from the manifest's kind."
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      manifest: z
        .any()
        .describe(
          'Full Kubernetes resource manifest as a JSON object. Must include apiVersion, kind, and metadata.name.'
        ),
      namespace: z
        .string()
        .optional()
        .describe(
          'Namespace to apply the resource in. Overrides metadata.namespace if provided.'
        )
    })
  )
  .output(
    z.object({
      apiVersion: z.string().describe('API version of the applied resource'),
      kind: z.string().describe('Kind of the applied resource'),
      resourceName: z.string().describe('Name of the applied resource'),
      resourceNamespace: z.string().optional().describe('Namespace of the applied resource'),
      resourceUid: z.string().optional().describe('UID of the applied resource'),
      wasCreated: z.boolean().describe('True if the resource was created, false if updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);
    let manifest = ctx.input.manifest;

    if (!manifest.kind || !manifest.apiVersion || !manifest.metadata?.name) {
      throw kubernetesServiceError(
        'Manifest must include apiVersion, kind, and metadata.name'
      );
    }

    // Try to get the existing resource to determine if this is create or update
    let wasCreated = false;
    let result: any;
    result = await client.applyResource(manifest, ctx.input.namespace);

    // Determine if it was created by checking if resourceVersion is the initial one
    // A heuristic: if we caught 404 in applyResource, it was created
    // Since applyResource handles this internally, we check the result
    wasCreated = !manifest.metadata?.resourceVersion;

    return {
      output: {
        apiVersion: result.apiVersion,
        kind: result.kind,
        resourceName: result.metadata.name,
        resourceNamespace: result.metadata.namespace,
        resourceUid: result.metadata.uid,
        wasCreated
      },
      message: `Applied ${result.kind} **${result.metadata.name}**${result.metadata.namespace ? ` in namespace **${result.metadata.namespace}**` : ''}.`
    };
  })
  .build();
