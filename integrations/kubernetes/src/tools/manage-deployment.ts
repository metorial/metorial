import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient } from '../lib/client';
import { kubernetesServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageDeployment = SlateTool.create(spec, {
  name: 'Manage Deployment',
  key: 'manage_deployment',
  description: `Create, update, scale, or restart a Kubernetes Deployment. Combine multiple operations in one call — for example, update the image and scale replicas simultaneously.
Also supports StatefulSets and DaemonSets for similar workload management.`,
  instructions: [
    'To restart a deployment, set action to "restart". This performs a rolling restart by updating the pod template annotation.',
    'To scale, provide the desired replicas count. Scaling is supported for Deployments, StatefulSets, and ReplicaSets.',
    'When updating the container image, provide containerName and the new image tag.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'scale', 'restart'])
        .describe('Action to perform on the deployment'),
      workloadType: z
        .enum(['deployments', 'statefulsets', 'daemonsets', 'replicasets'])
        .default('deployments')
        .describe('Type of workload to manage'),
      deploymentName: z.string().describe('Name of the deployment/workload'),
      namespace: z.string().optional().describe('Namespace of the deployment'),
      replicas: z
        .number()
        .optional()
        .describe('Desired number of replicas (for scale action or create/update)'),
      containerName: z.string().optional().describe('Name of the container to update'),
      image: z.string().optional().describe('New container image (e.g. "nginx:1.25")'),
      serviceName: z
        .string()
        .optional()
        .describe(
          'Headless service name for StatefulSet creation. Defaults to deploymentName when omitted.'
        ),
      labels: z
        .record(z.string(), z.string())
        .optional()
        .describe('Labels to set on the deployment'),
      annotations: z
        .record(z.string(), z.string())
        .optional()
        .describe('Annotations to set on the deployment'),
      manifest: z
        .any()
        .optional()
        .describe(
          'Full Kubernetes manifest for create action. When provided, other fields (except action and namespace) are ignored.'
        )
    })
  )
  .output(
    z.object({
      deploymentName: z.string().describe('Name of the deployment'),
      deploymentNamespace: z.string().optional().describe('Namespace of the deployment'),
      action: z.string().describe('Action that was performed'),
      replicas: z.number().optional().describe('Current desired replicas'),
      readyReplicas: z.number().optional().describe('Number of ready replicas'),
      updatedReplicas: z.number().optional().describe('Number of updated replicas'),
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
        .describe('Deployment conditions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);
    let { action, workloadType, deploymentName, namespace } = ctx.input;
    let result: any;

    if (action === 'create') {
      if (ctx.input.manifest) {
        result = await client.createResource(workloadType, ctx.input.manifest, namespace);
      } else {
        if (!ctx.input.image) {
          throw kubernetesServiceError(
            'image is required when creating a workload without a full manifest.'
          );
        }
        let kindMap: Record<string, string> = {
          deployments: 'Deployment',
          statefulsets: 'StatefulSet',
          daemonsets: 'DaemonSet',
          replicasets: 'ReplicaSet'
        };
        let body: any = {
          apiVersion: 'apps/v1',
          kind: kindMap[workloadType],
          metadata: {
            name: deploymentName,
            labels: ctx.input.labels,
            annotations: ctx.input.annotations
          },
          spec: {
            selector: {
              matchLabels: ctx.input.labels || { app: deploymentName }
            },
            template: {
              metadata: {
                labels: ctx.input.labels || { app: deploymentName }
              },
              spec: {
                containers: ctx.input.image
                  ? [
                      {
                        name: ctx.input.containerName || deploymentName,
                        image: ctx.input.image
                      }
                    ]
                  : []
              }
            }
          }
        };
        if (workloadType !== 'daemonsets') {
          body.spec.replicas = ctx.input.replicas ?? 1;
        }
        if (workloadType === 'statefulsets') {
          body.spec.serviceName = ctx.input.serviceName || deploymentName;
        }
        result = await client.createResource(workloadType, body, namespace);
      }
    } else if (action === 'scale') {
      if (workloadType === 'daemonsets') {
        throw kubernetesServiceError(
          'DaemonSets do not expose the Kubernetes scale subresource.'
        );
      }
      if (ctx.input.replicas === undefined) {
        throw kubernetesServiceError('replicas is required for scale action');
      }
      let _scaleResult = await client.setResourceScale(
        workloadType,
        deploymentName,
        ctx.input.replicas,
        namespace
      );
      result = await client.getResource(workloadType, deploymentName, namespace);
    } else if (action === 'restart') {
      if (workloadType === 'replicasets') {
        throw kubernetesServiceError(
          'Restart is supported for deployments, statefulsets, and daemonsets.'
        );
      }
      if (workloadType === 'deployments') {
        result = await client.restartDeployment(deploymentName, namespace);
      } else {
        // Restart via annotation patch for statefulsets/daemonsets
        result = await client.patchResource(
          workloadType,
          deploymentName,
          {
            spec: {
              template: {
                metadata: {
                  annotations: {
                    'kubectl.kubernetes.io/restartedAt': new Date().toISOString()
                  }
                }
              }
            }
          },
          namespace,
          'strategic'
        );
      }
    } else {
      // update
      let patch: any = {};
      if (ctx.input.image && !ctx.input.containerName) {
        throw kubernetesServiceError(
          'containerName is required when updating a container image.'
        );
      }
      if (ctx.input.image && ctx.input.containerName) {
        patch.spec = {
          template: {
            spec: {
              containers: [
                {
                  name: ctx.input.containerName,
                  image: ctx.input.image
                }
              ]
            }
          }
        };
      }
      if (ctx.input.replicas !== undefined) {
        patch.spec = patch.spec || {};
        patch.spec.replicas = ctx.input.replicas;
      }
      if (ctx.input.labels) {
        patch.metadata = patch.metadata || {};
        patch.metadata.labels = ctx.input.labels;
      }
      if (ctx.input.annotations) {
        patch.metadata = patch.metadata || {};
        patch.metadata.annotations = ctx.input.annotations;
      }

      if (Object.keys(patch).length === 0) {
        throw kubernetesServiceError(
          'Provide image, replicas, labels, or annotations when updating a workload.'
        );
      }

      result = await client.patchResource(
        workloadType,
        deploymentName,
        patch,
        namespace,
        'strategic'
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
        deploymentName: result.metadata.name,
        deploymentNamespace: result.metadata.namespace,
        action,
        replicas: result.spec?.replicas,
        readyReplicas: result.status?.readyReplicas,
        updatedReplicas: result.status?.updatedReplicas,
        conditions
      },
      message: `Successfully performed **${action}** on ${workloadType.slice(0, -1)} **${result.metadata.name}**${result.metadata.namespace ? ` in namespace **${result.metadata.namespace}**` : ''}.${ctx.input.replicas !== undefined ? ` Replicas: ${result.spec?.replicas}` : ''}`
    };
  })
  .build();
