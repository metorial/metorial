import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { pagerDutyServiceError } from '../lib/errors';
import type { PagerDutyIntegration } from '../lib/types';
import { spec } from '../spec';

let formatIntegration = (integration: PagerDutyIntegration) => ({
  integrationId: integration.id,
  name: integration.name ?? integration.summary,
  type: integration.type,
  integrationKey: integration.integration_key,
  integrationEmail: integration.integration_email,
  serviceId: integration.service?.id,
  serviceName: integration.service?.summary,
  vendorId: integration.vendor?.id,
  vendorName: integration.vendor?.summary,
  htmlUrl: integration.html_url,
  createdAt: integration.created_at
});

export let manageServiceIntegration = SlateTool.create(spec, {
  name: 'Manage Service Integration',
  key: 'manage_service_integration',
  description: `List, get, create, or update PagerDuty service integrations. Use this to provision Events API v2 routing keys for sending alert and change events with send_event.`,
  instructions: [
    'Set **action** to "list", "get", "create", or "update".',
    'For all actions, **serviceId** is required.',
    'For get/update, **integrationId** is required.',
    'For create, **name** is required. The default **integrationType** creates an Events API v2 inbound integration and returns its routing key.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'update']).describe('Action to perform'),
      serviceId: z.string().describe('PagerDuty service ID'),
      integrationId: z.string().optional().describe('Service integration ID'),
      name: z.string().optional().describe('Integration name'),
      integrationType: z
        .enum(['events_api_v2_inbound_integration', 'generic_events_api_inbound_integration'])
        .optional()
        .describe('Inbound events integration type for create'),
      vendorId: z
        .string()
        .optional()
        .describe('Optional PagerDuty vendor ID to associate with the integration')
    })
  )
  .output(
    z.object({
      integrations: z
        .array(
          z.object({
            integrationId: z.string().describe('Integration ID'),
            name: z.string().optional().describe('Integration name'),
            type: z.string().optional().describe('Integration type'),
            integrationKey: z.string().optional().describe('Events API routing key'),
            integrationEmail: z.string().optional().describe('Inbound email address'),
            serviceId: z.string().optional().describe('Service ID'),
            serviceName: z.string().optional().describe('Service name'),
            vendorId: z.string().optional().describe('Vendor ID'),
            vendorName: z.string().optional().describe('Vendor name'),
            htmlUrl: z.string().optional().describe('Web URL'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('Service integrations for list action'),
      integrationId: z.string().optional().describe('Integration ID'),
      name: z.string().optional().describe('Integration name'),
      type: z.string().optional().describe('Integration type'),
      integrationKey: z.string().optional().describe('Events API routing key'),
      integrationEmail: z.string().optional().describe('Inbound email address'),
      serviceId: z.string().optional().describe('Service ID'),
      serviceName: z.string().optional().describe('Service name'),
      vendorId: z.string().optional().describe('Vendor ID'),
      vendorName: z.string().optional().describe('Vendor name'),
      htmlUrl: z.string().optional().describe('Web URL'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    if (ctx.input.action === 'list') {
      let integrations = await client.listServiceIntegrations(ctx.input.serviceId);
      return {
        output: {
          integrations: integrations.map(formatIntegration)
        },
        message: `Found **${integrations.length}** service integration(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.integrationId)
        throw pagerDutyServiceError('integrationId is required for getting an integration');

      let integration = await client.getServiceIntegration(
        ctx.input.serviceId,
        ctx.input.integrationId
      );

      return {
        output: formatIntegration(integration),
        message: `Fetched service integration **${integration.name ?? integration.id}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name)
        throw pagerDutyServiceError('name is required for creating an integration');

      let integration = await client.createServiceIntegration({
        serviceId: ctx.input.serviceId,
        name: ctx.input.name,
        integrationType: ctx.input.integrationType,
        vendorId: ctx.input.vendorId
      });

      return {
        output: formatIntegration(integration),
        message: `Created service integration **${integration.name ?? integration.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.integrationId)
        throw pagerDutyServiceError('integrationId is required for updating an integration');
      if (!ctx.input.name)
        throw pagerDutyServiceError('name is required for updating an integration');

      let integration = await client.updateServiceIntegration({
        serviceId: ctx.input.serviceId,
        integrationId: ctx.input.integrationId,
        name: ctx.input.name
      });

      return {
        output: formatIntegration(integration),
        message: `Updated service integration **${integration.name ?? integration.id}**.`
      };
    }

    throw pagerDutyServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
