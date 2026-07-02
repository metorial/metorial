import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient } from '../lib/client';
import { spec } from '../spec';

export let manageConfigStorage = SlateTool.create(spec, {
  name: 'Manage ConfigMap or Secret',
  key: 'manage_config_storage',
  description: `Create or update Kubernetes ConfigMaps and Secrets. Supports setting key-value data directly, or providing a full manifest.
For secrets, values should be provided as plain text — they will be base64-encoded automatically.`,
  instructions: [
    'When updating, only provided keys are changed; existing keys not in the update are preserved.',
    'For secrets, provide plaintext values — they are automatically base64-encoded.',
    'To delete a specific key, set its value to an empty string in the entries.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Action to perform'),
      resourceKind: z
        .enum(['configmaps', 'secrets'])
        .describe('Whether to manage a ConfigMap or Secret'),
      resourceName: z.string().describe('Name of the ConfigMap or Secret'),
      namespace: z.string().optional().describe('Namespace'),
      entries: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value data to set. For secrets, provide plain text values.'),
      secretType: z
        .string()
        .optional()
        .describe('Secret type (e.g. "Opaque", "kubernetes.io/tls"). Only for secrets.'),
      labels: z.record(z.string(), z.string()).optional().describe('Labels to set'),
      annotations: z.record(z.string(), z.string()).optional().describe('Annotations to set'),
      manifest: z.any().optional().describe('Full manifest. Overrides other fields.')
    })
  )
  .output(
    z.object({
      resourceName: z.string().describe('Name of the resource'),
      resourceNamespace: z.string().optional().describe('Namespace'),
      resourceKind: z.string().describe('ConfigMap or Secret'),
      keyCount: z.number().describe('Number of data keys in the resource'),
      keys: z.array(z.string()).describe('List of data keys')
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);
    let { action, resourceKind, resourceName, namespace } = ctx.input;
    let result: any;

    if (ctx.input.manifest) {
      if (action === 'create') {
        result = await client.createResource(resourceKind, ctx.input.manifest, namespace);
      } else {
        result = await client.applyResource(ctx.input.manifest, namespace);
      }
    } else if (action === 'create') {
      let body: any = {
        apiVersion: 'v1',
        kind: resourceKind === 'configmaps' ? 'ConfigMap' : 'Secret',
        metadata: {
          name: resourceName,
          labels: ctx.input.labels,
          annotations: ctx.input.annotations
        }
      };

      if (resourceKind === 'configmaps') {
        body.data = ctx.input.entries || {};
      } else {
        body.type = ctx.input.secretType || 'Opaque';
        // Base64-encode secret values
        let encodedData: Record<string, string> = {};
        if (ctx.input.entries) {
          for (let [key, value] of Object.entries(ctx.input.entries)) {
            encodedData[key] = btoa(value as string);
          }
        }
        body.data = encodedData;
      }

      result = await client.createResource(resourceKind, body, namespace);
    } else {
      // update via merge patch
      let patch: any = {};

      if (resourceKind === 'configmaps') {
        if (ctx.input.entries) {
          patch.data = ctx.input.entries;
        }
      } else if (ctx.input.entries) {
        let encodedData: Record<string, string> = {};
        for (let [key, value] of Object.entries(ctx.input.entries)) {
          encodedData[key] = btoa(value as string);
        }
        patch.data = encodedData;
      }

      if (ctx.input.labels) {
        patch.metadata = { labels: ctx.input.labels };
      }
      if (ctx.input.annotations) {
        patch.metadata = patch.metadata || {};
        patch.metadata.annotations = ctx.input.annotations;
      }

      result = await client.patchResource(
        resourceKind,
        resourceName,
        patch,
        namespace,
        'strategic'
      );
    }

    let dataKeys = Object.keys(result.data || {});

    return {
      output: {
        resourceName: result.metadata.name,
        resourceNamespace: result.metadata.namespace,
        resourceKind: result.kind,
        keyCount: dataKeys.length,
        keys: dataKeys
      },
      message: `Successfully ${action === 'create' ? 'created' : 'updated'} ${result.kind} **${result.metadata.name}** with ${dataKeys.length} key(s): ${dataKeys.join(', ') || '(none)'}.`
    };
  })
  .build();
