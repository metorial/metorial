import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient } from '../lib/client';
import { spec } from '../spec';

export let manageAutoscaler = SlateTool.create(spec, {
  name: 'Manage HorizontalPodAutoscaler',
  key: 'manage_autoscaler',
  description: `Create, update, or get the status of a HorizontalPodAutoscaler (HPA). HPAs automatically scale the number of pod replicas based on CPU utilization, memory usage, or custom metrics.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get']).describe('Action to perform'),
      hpaName: z.string().describe('Name of the HorizontalPodAutoscaler'),
      namespace: z.string().optional().describe('Namespace'),
      targetRef: z
        .object({
          apiVersion: z
            .string()
            .optional()
            .describe('API version of the target (e.g. "apps/v1")'),
          targetKind: z
            .enum(['Deployment', 'StatefulSet', 'ReplicaSet'])
            .describe('Kind of the scale target'),
          targetName: z.string().describe('Name of the scale target')
        })
        .optional()
        .describe('Scale target reference (required for create)'),
      minReplicas: z.number().optional().describe('Minimum number of replicas'),
      maxReplicas: z.number().optional().describe('Maximum number of replicas'),
      targetCpuPercent: z.number().optional().describe('Target CPU utilization percentage'),
      targetMemoryPercent: z
        .number()
        .optional()
        .describe('Target memory utilization percentage'),
      manifest: z.any().optional().describe('Full HPA manifest. Overrides other fields.')
    })
  )
  .output(
    z.object({
      hpaName: z.string().describe('Name of the HPA'),
      hpaNamespace: z.string().optional().describe('Namespace'),
      minReplicas: z.number().optional().describe('Minimum replicas'),
      maxReplicas: z.number().optional().describe('Maximum replicas'),
      currentReplicas: z.number().optional().describe('Current replica count'),
      desiredReplicas: z.number().optional().describe('Desired replica count'),
      currentMetrics: z.array(z.any()).optional().describe('Current metric values'),
      conditions: z
        .array(
          z.object({
            conditionType: z.string(),
            conditionStatus: z.string(),
            reason: z.string().optional(),
            message: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);
    let { action, hpaName, namespace } = ctx.input;
    let result: any;

    if (action === 'get') {
      result = await client.getResource('horizontalpodautoscalers', hpaName, namespace);
    } else if (ctx.input.manifest) {
      if (action === 'create') {
        result = await client.createResource(
          'horizontalpodautoscalers',
          ctx.input.manifest,
          namespace
        );
      } else {
        result = await client.applyResource(ctx.input.manifest, namespace);
      }
    } else if (action === 'create') {
      if (!ctx.input.targetRef || !ctx.input.maxReplicas) {
        throw new Error('targetRef and maxReplicas are required for creating an HPA');
      }

      let metrics: any[] = [];
      if (ctx.input.targetCpuPercent) {
        metrics.push({
          type: 'Resource',
          resource: {
            name: 'cpu',
            target: {
              type: 'Utilization',
              averageUtilization: ctx.input.targetCpuPercent
            }
          }
        });
      }
      if (ctx.input.targetMemoryPercent) {
        metrics.push({
          type: 'Resource',
          resource: {
            name: 'memory',
            target: {
              type: 'Utilization',
              averageUtilization: ctx.input.targetMemoryPercent
            }
          }
        });
      }

      let body = {
        apiVersion: 'autoscaling/v2',
        kind: 'HorizontalPodAutoscaler',
        metadata: { name: hpaName },
        spec: {
          scaleTargetRef: {
            apiVersion: ctx.input.targetRef.apiVersion || 'apps/v1',
            kind: ctx.input.targetRef.targetKind,
            name: ctx.input.targetRef.targetName
          },
          minReplicas: ctx.input.minReplicas ?? 1,
          maxReplicas: ctx.input.maxReplicas,
          metrics: metrics.length > 0 ? metrics : undefined
        }
      };

      result = await client.createResource('horizontalpodautoscalers', body, namespace);
    } else {
      // update
      let patch: any = { spec: {} };
      if (ctx.input.minReplicas !== undefined) patch.spec.minReplicas = ctx.input.minReplicas;
      if (ctx.input.maxReplicas !== undefined) patch.spec.maxReplicas = ctx.input.maxReplicas;

      let metrics: any[] = [];
      if (ctx.input.targetCpuPercent) {
        metrics.push({
          type: 'Resource',
          resource: {
            name: 'cpu',
            target: { type: 'Utilization', averageUtilization: ctx.input.targetCpuPercent }
          }
        });
      }
      if (ctx.input.targetMemoryPercent) {
        metrics.push({
          type: 'Resource',
          resource: {
            name: 'memory',
            target: { type: 'Utilization', averageUtilization: ctx.input.targetMemoryPercent }
          }
        });
      }
      if (metrics.length > 0) {
        patch.spec.metrics = metrics;
      }

      result = await client.patchResource(
        'horizontalpodautoscalers',
        hpaName,
        patch,
        namespace,
        'merge'
      );
    }

    let conditions = result.status?.conditions?.map((c: any) => ({
      conditionType: c.type,
      conditionStatus: c.status,
      reason: c.reason,
      message: c.message
    }));

    return {
      output: {
        hpaName: result.metadata.name,
        hpaNamespace: result.metadata.namespace,
        minReplicas: result.spec?.minReplicas,
        maxReplicas: result.spec?.maxReplicas,
        currentReplicas: result.status?.currentReplicas,
        desiredReplicas: result.status?.desiredReplicas,
        currentMetrics: result.status?.currentMetrics,
        conditions
      },
      message: `${action === 'get' ? 'Retrieved' : action === 'create' ? 'Created' : 'Updated'} HPA **${result.metadata.name}** (min: ${result.spec?.minReplicas}, max: ${result.spec?.maxReplicas}, current: ${result.status?.currentReplicas ?? 'N/A'}).`
    };
  })
  .build();
