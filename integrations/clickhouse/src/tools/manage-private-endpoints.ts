import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

export let getPrivateEndpointConfig = SlateTool.create(spec, {
  name: 'Get Private Endpoint Config',
  key: 'get_private_endpoint_config',
  description: `Retrieve the private endpoint configuration for a specific service. Shows available private endpoint service IDs for connecting from your cloud VPC.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service')
    })
  )
  .output(
    z.object({
      endpointConfig: z
        .record(z.string(), z.any())
        .describe('Private endpoint configuration details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let config = await client.getPrivateEndpointConfig(ctx.input.serviceId);

    return {
      output: { endpointConfig: config },
      message: `Retrieved private endpoint configuration for service ${ctx.input.serviceId}.`
    };
  })
  .build();

export let listReversePrivateEndpoints = SlateTool.create(spec, {
  name: 'List Reverse Private Endpoints',
  key: 'list_reverse_private_endpoints',
  description: `List all reverse private endpoints for a service. Reverse private endpoints allow ClickHouse Cloud to securely initiate connections to private customer resources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service')
    })
  )
  .output(
    z.object({
      reversePrivateEndpoints: z.array(
        z.object({
          id: z.string().optional(),
          endpointId: z.string().optional(),
          serviceId: z.string().optional(),
          description: z.string().optional(),
          type: z.string().optional(),
          status: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let endpoints = await client.listReversePrivateEndpoints(ctx.input.serviceId);
    let items = Array.isArray(endpoints) ? endpoints : [];

    return {
      output: {
        reversePrivateEndpoints: items.map((e: any) => ({
          id: e.id,
          endpointId: e.endpointId,
          serviceId: e.serviceId,
          description: e.description,
          type: e.type,
          status: e.status
        }))
      },
      message: `Found **${items.length}** reverse private endpoints for service ${ctx.input.serviceId}.`
    };
  })
  .build();

export let createReversePrivateEndpoint = SlateTool.create(spec, {
  name: 'Create Reverse Private Endpoint',
  key: 'create_reverse_private_endpoint',
  description: `Create a new reverse private endpoint for a service, enabling ClickHouse Cloud to securely connect to your private resources.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      description: z
        .string()
        .optional()
        .describe('Description for the reverse private endpoint'),
      type: z
        .enum([
          'VPC_ENDPOINT_SERVICE',
          'VPC_RESOURCE',
          'MSK_MULTI_VPC',
          'GCP_PSC_SERVICE_ATTACHMENT'
        ])
        .describe('Reverse private endpoint type'),
      vpcEndpointServiceName: z
        .string()
        .optional()
        .describe('VPC endpoint service name for VPC_ENDPOINT_SERVICE endpoints'),
      vpcResourceConfigurationId: z
        .string()
        .optional()
        .describe('VPC resource configuration ID for VPC_RESOURCE endpoints'),
      vpcResourceShareArn: z
        .string()
        .optional()
        .describe('VPC resource share ARN for VPC_RESOURCE endpoints'),
      mskClusterArn: z
        .string()
        .optional()
        .describe('MSK cluster ARN for MSK_MULTI_VPC endpoints'),
      mskAuthentication: z
        .enum(['SASL_IAM', 'SASL_SCRAM'])
        .optional()
        .describe('MSK authentication type for MSK_MULTI_VPC endpoints'),
      gcpServiceAttachment: z
        .string()
        .optional()
        .describe('GCP PSC service attachment URI for GCP_PSC_SERVICE_ATTACHMENT endpoints')
    })
  )
  .output(
    z.object({
      id: z.string().optional(),
      endpointId: z.string().optional(),
      serviceId: z.string().optional(),
      description: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body = Object.fromEntries(
      Object.entries({
        description: ctx.input.description,
        type: ctx.input.type,
        vpcEndpointServiceName: ctx.input.vpcEndpointServiceName,
        vpcResourceConfigurationId: ctx.input.vpcResourceConfigurationId,
        vpcResourceShareArn: ctx.input.vpcResourceShareArn,
        mskClusterArn: ctx.input.mskClusterArn,
        mskAuthentication: ctx.input.mskAuthentication,
        gcpServiceAttachment: ctx.input.gcpServiceAttachment
      }).filter(([, value]) => value !== undefined)
    );

    let result = await client.createReversePrivateEndpoint(ctx.input.serviceId, body);

    return {
      output: {
        id: result.id,
        endpointId: result.endpointId,
        serviceId: result.serviceId,
        description: result.description,
        type: result.type,
        status: result.status
      },
      message: `Reverse private endpoint **${result.id}** created for service ${ctx.input.serviceId}.`
    };
  })
  .build();

export let deleteReversePrivateEndpoint = SlateTool.create(spec, {
  name: 'Delete Reverse Private Endpoint',
  key: 'delete_reverse_private_endpoint',
  description: `Delete a reverse private endpoint from a service.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      reversePrivateEndpointId: z
        .string()
        .describe('ID of the reverse private endpoint to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteReversePrivateEndpoint(
      ctx.input.serviceId,
      ctx.input.reversePrivateEndpointId
    );

    return {
      output: { deleted: true },
      message: `Reverse private endpoint **${ctx.input.reversePrivateEndpointId}** deleted.`
    };
  })
  .build();
