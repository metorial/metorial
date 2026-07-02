import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient } from '../lib/client';
import { spec } from '../spec';

export let manageNamespace = SlateTool.create(spec, {
  name: 'Manage Namespace',
  key: 'manage_namespace',
  description: `Create, update, or list Kubernetes namespaces. Use this to organize cluster resources into logical groups for multi-tenancy and isolation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'list']).describe('Action to perform'),
      namespaceName: z
        .string()
        .optional()
        .describe('Name of the namespace (required for create/update)'),
      labels: z
        .record(z.string(), z.string())
        .optional()
        .describe('Labels to set on the namespace'),
      annotations: z
        .record(z.string(), z.string())
        .optional()
        .describe('Annotations to set on the namespace')
    })
  )
  .output(
    z.object({
      namespaces: z
        .array(
          z.object({
            namespaceName: z.string().describe('Name of the namespace'),
            phase: z.string().optional().describe('Namespace phase (Active, Terminating)'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            labels: z.record(z.string(), z.string()).optional().describe('Namespace labels')
          })
        )
        .describe('List of namespaces (single item for create/update)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);
    let { action, namespaceName } = ctx.input;

    if (action === 'list') {
      let result = await client.getNamespaces();
      let namespaces = result.items.map(item => ({
        namespaceName: item.metadata.name,
        phase: item.status?.phase,
        createdAt: item.metadata.creationTimestamp,
        labels: item.metadata.labels
      }));

      return {
        output: { namespaces },
        message: `Listed **${namespaces.length}** namespaces.`
      };
    }

    if (!namespaceName) {
      throw new Error('namespaceName is required for create/update actions');
    }

    if (action === 'create') {
      let body = {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: namespaceName,
          labels: ctx.input.labels,
          annotations: ctx.input.annotations
        }
      };
      let result = await client.createResource('namespaces', body);
      return {
        output: {
          namespaces: [
            {
              namespaceName: result.metadata.name,
              phase: result.status?.phase,
              createdAt: result.metadata.creationTimestamp,
              labels: result.metadata.labels
            }
          ]
        },
        message: `Created namespace **${result.metadata.name}**.`
      };
    }

    // update
    let patch: any = {};
    if (ctx.input.labels) {
      patch.metadata = { labels: ctx.input.labels };
    }
    if (ctx.input.annotations) {
      patch.metadata = patch.metadata || {};
      patch.metadata.annotations = ctx.input.annotations;
    }

    let result = await client.patchResource(
      'namespaces',
      namespaceName,
      patch,
      undefined,
      'strategic'
    );
    return {
      output: {
        namespaces: [
          {
            namespaceName: result.metadata.name,
            phase: result.status?.phase,
            createdAt: result.metadata.creationTimestamp,
            labels: result.metadata.labels
          }
        ]
      },
      message: `Updated namespace **${result.metadata.name}**.`
    };
  })
  .build();
