import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient } from '../lib/client';
import { kubernetesServiceError } from '../lib/errors';
import { spec } from '../spec';

let portSchema = z.object({
  portName: z.string().optional().describe('Name of the port'),
  port: z.number().describe('Port number that the service exposes'),
  targetPort: z
    .union([z.number(), z.string()])
    .optional()
    .describe('Target port on the pod (number or named port)'),
  protocol: z.enum(['TCP', 'UDP', 'SCTP']).optional().describe('Protocol for this port'),
  nodePort: z.number().optional().describe('Node port (for NodePort/LoadBalancer services)')
});

export let manageService = SlateTool.create(spec, {
  name: 'Manage Service',
  key: 'manage_service',
  description: `Create or update a Kubernetes Service, including ClusterIP, NodePort, LoadBalancer, and ExternalName types.
Also manages Ingress resources for HTTP(S) routing.`,
  instructions: [
    'For creating a service, provide at minimum serviceName, ports, and selector.',
    'Set resourceKind to "ingresses" to manage Ingress resources instead of Services.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Action to perform'),
      resourceKind: z
        .enum(['services', 'ingresses'])
        .default('services')
        .describe('Whether to manage a Service or Ingress'),
      serviceName: z.string().describe('Name of the service or ingress'),
      namespace: z.string().optional().describe('Namespace of the service'),
      serviceType: z
        .enum(['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'])
        .optional()
        .describe('Service type (only for services)'),
      externalName: z
        .string()
        .optional()
        .describe(
          'DNS name for ExternalName services. Required when serviceType is ExternalName.'
        ),
      selector: z
        .record(z.string(), z.string())
        .optional()
        .describe('Pod selector labels for the service'),
      ports: z.array(portSchema).optional().describe('Port configurations'),
      labels: z.record(z.string(), z.string()).optional().describe('Labels to set'),
      annotations: z.record(z.string(), z.string()).optional().describe('Annotations to set'),
      manifest: z
        .any()
        .optional()
        .describe('Full manifest for create/update. Overrides other fields.')
    })
  )
  .output(
    z.object({
      serviceName: z.string().describe('Name of the service'),
      serviceNamespace: z.string().optional().describe('Namespace of the service'),
      serviceType: z.string().optional().describe('Type of the service'),
      clusterIp: z.string().optional().describe('Cluster IP assigned to the service'),
      externalIps: z.array(z.string()).optional().describe('External IPs'),
      loadBalancerIp: z.string().optional().describe('Load balancer IP if applicable'),
      ports: z
        .array(
          z.object({
            portName: z.string().optional(),
            port: z.number(),
            targetPort: z.any().optional(),
            nodePort: z.number().optional()
          })
        )
        .optional()
        .describe('Port configurations')
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);
    let { action, resourceKind, serviceName, namespace } = ctx.input;
    let result: any;

    if (ctx.input.manifest) {
      if (action === 'create') {
        result = await client.createResource(resourceKind, ctx.input.manifest, namespace);
      } else {
        result = await client.applyResource(ctx.input.manifest, namespace);
      }
    } else if (resourceKind === 'services') {
      if (action === 'create') {
        if (ctx.input.serviceType === 'ExternalName' && !ctx.input.externalName) {
          throw kubernetesServiceError(
            'externalName is required when creating an ExternalName service.'
          );
        }
        if (ctx.input.serviceType !== 'ExternalName' && !ctx.input.ports?.length) {
          throw kubernetesServiceError(
            'ports is required when creating a Kubernetes service.'
          );
        }
        if (ctx.input.serviceType !== 'ExternalName' && ctx.input.externalName) {
          throw kubernetesServiceError(
            'externalName can only be used with ExternalName services.'
          );
        }

        let body: any = {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            name: serviceName,
            labels: ctx.input.labels,
            annotations: ctx.input.annotations
          },
          spec: {
            type: ctx.input.serviceType || 'ClusterIP',
            selector:
              ctx.input.serviceType === 'ExternalName' ? undefined : ctx.input.selector,
            externalName: ctx.input.externalName,
            ports: ctx.input.ports?.map(p => ({
              name: p.portName,
              port: p.port,
              targetPort: p.targetPort,
              protocol: p.protocol || 'TCP',
              nodePort: p.nodePort
            }))
          }
        };
        result = await client.createResource('services', body, namespace);
      } else {
        let patch: any = { spec: {} };
        if (ctx.input.serviceType) patch.spec.type = ctx.input.serviceType;
        if (ctx.input.serviceType === 'ExternalName' && !ctx.input.externalName) {
          throw kubernetesServiceError(
            'externalName is required when changing a service to ExternalName.'
          );
        }
        if (ctx.input.externalName && ctx.input.serviceType !== 'ExternalName') {
          throw kubernetesServiceError(
            'externalName can only be used when serviceType is ExternalName.'
          );
        }
        if (ctx.input.externalName) patch.spec.externalName = ctx.input.externalName;
        if (ctx.input.selector) patch.spec.selector = ctx.input.selector;
        if (ctx.input.ports) {
          patch.spec.ports = ctx.input.ports.map(p => ({
            name: p.portName,
            port: p.port,
            targetPort: p.targetPort,
            protocol: p.protocol || 'TCP',
            nodePort: p.nodePort
          }));
        }
        if (ctx.input.labels) patch.metadata = { labels: ctx.input.labels };
        if (ctx.input.annotations) {
          patch.metadata = patch.metadata || {};
          patch.metadata.annotations = ctx.input.annotations;
        }
        if (Object.keys(patch.spec).length === 0 && !patch.metadata) {
          throw kubernetesServiceError(
            'Provide serviceType, externalName, selector, ports, labels, or annotations when updating a service.'
          );
        }
        result = await client.patchResource(
          'services',
          serviceName,
          patch,
          namespace,
          'strategic'
        );
      }
    } else {
      throw kubernetesServiceError(
        'For Ingress creation/update, please provide a full manifest.'
      );
    }

    let ports = result.spec?.ports?.map((p: any) => ({
      portName: p.name,
      port: p.port,
      targetPort: p.targetPort,
      nodePort: p.nodePort
    }));

    return {
      output: {
        serviceName: result.metadata.name,
        serviceNamespace: result.metadata.namespace,
        serviceType: result.spec?.type,
        clusterIp: result.spec?.clusterIP,
        externalIps: result.spec?.externalIPs,
        loadBalancerIp: result.status?.loadBalancer?.ingress?.[0]?.ip,
        ports
      },
      message: `Successfully ${action === 'create' ? 'created' : 'updated'} service **${result.metadata.name}** (type: ${result.spec?.type || 'N/A'}).`
    };
  })
  .build();
