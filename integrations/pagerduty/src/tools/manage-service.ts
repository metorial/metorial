import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { pagerDutyServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageService = SlateTool.create(spec, {
  name: 'Manage Service',
  key: 'manage_service',
  description: `Create, update, or delete a PagerDuty service. When creating, an escalation policy is required. Supports configuring auto-resolve timeout, acknowledgement timeout, alert creation settings, and urgency rules.`,
  instructions: [
    'Set **action** to "create", "update", or "delete".',
    'For create: **name** and **escalationPolicyId** are required.',
    'For update: **serviceId** is required plus any fields to change.',
    'Set **autoResolveTimeout** to `null` to disable auto-resolve.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      serviceId: z.string().optional().describe('Service ID (required for update/delete)'),
      name: z.string().optional().describe('Service name (required for create)'),
      description: z.string().optional().describe('Service description'),
      escalationPolicyId: z
        .string()
        .optional()
        .describe('Escalation policy ID (required for create)'),
      autoResolveTimeout: z
        .number()
        .nullable()
        .optional()
        .describe('Auto-resolve timeout in seconds (null to disable)'),
      acknowledgementTimeout: z
        .number()
        .nullable()
        .optional()
        .describe('Acknowledgement timeout in seconds (null to disable)'),
      alertCreation: z
        .enum(['create_incidents', 'create_alerts_and_incidents'])
        .optional()
        .describe('Alert creation behavior'),
      urgency: z.enum(['high', 'low']).optional().describe('Default incident urgency')
    })
  )
  .output(
    z.object({
      serviceId: z.string().optional().describe('Service ID'),
      name: z.string().optional().describe('Service name'),
      status: z.string().optional().describe('Service status'),
      htmlUrl: z.string().optional().describe('Web URL'),
      deleted: z.boolean().optional().describe('Whether the service was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name)
        throw pagerDutyServiceError('name is required for creating a service');
      if (!ctx.input.escalationPolicyId)
        throw pagerDutyServiceError('escalationPolicyId is required for creating a service');

      let service = await client.createService({
        name: ctx.input.name,
        description: ctx.input.description,
        escalationPolicyId: ctx.input.escalationPolicyId,
        autoResolveTimeout: ctx.input.autoResolveTimeout,
        acknowledgementTimeout: ctx.input.acknowledgementTimeout,
        alertCreation: ctx.input.alertCreation,
        urgency: ctx.input.urgency
      });

      return {
        output: {
          serviceId: service.id,
          name: service.name,
          status: service.status,
          htmlUrl: service.html_url
        },
        message: `Created service **${service.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.serviceId)
        throw pagerDutyServiceError('serviceId is required for updating a service');

      let service = await client.updateService(ctx.input.serviceId, {
        name: ctx.input.name,
        description: ctx.input.description,
        escalationPolicyId: ctx.input.escalationPolicyId,
        autoResolveTimeout: ctx.input.autoResolveTimeout,
        acknowledgementTimeout: ctx.input.acknowledgementTimeout,
        alertCreation: ctx.input.alertCreation,
        urgency: ctx.input.urgency
      });

      return {
        output: {
          serviceId: service.id,
          name: service.name,
          status: service.status,
          htmlUrl: service.html_url
        },
        message: `Updated service **${service.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.serviceId)
        throw pagerDutyServiceError('serviceId is required for deleting a service');
      await client.deleteService(ctx.input.serviceId);

      return {
        output: {
          serviceId: ctx.input.serviceId,
          deleted: true
        },
        message: `Deleted service \`${ctx.input.serviceId}\`.`
      };
    }

    throw pagerDutyServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
