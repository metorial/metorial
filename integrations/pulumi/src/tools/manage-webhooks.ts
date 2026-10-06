import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  tags: { destructive: true },
  description: `List, create, or delete webhooks in Pulumi Cloud. Supports both organization-level webhooks (receive events for all stacks) and stack-level webhooks (scoped to a single stack).`,
  instructions: [
    'For organization webhooks, omit projectName and stackName.',
    'For stack webhooks, provide projectName and stackName.',
    'Supported formats: "raw" (JSON), "slack", "ms_teams", "pulumi_deployments".',
    'Available filters: stack_created, stack_deleted, preview_succeeded, preview_failed, update_succeeded, update_failed, destroy_succeeded, destroy_failed, refresh_succeeded, refresh_failed, deployment_queued, deployment_started, deployment_succeeded, deployment_failed, drift_detected, drift_detection_succeeded, drift_detection_failed, drift_remediation_succeeded, drift_remediation_failed, policy_violation_mandatory, policy_violation_advisory.'
  ]
})
  .input(
    z.object({
      organization: organizationInput,
      projectName: z.string().optional().describe('Project name (for stack webhooks)'),
      stackName: z.string().optional().describe('Stack name (for stack webhooks)'),
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      displayName: z
        .string()
        .optional()
        .describe('Webhook display name (required for create)'),
      payloadUrl: z
        .string()
        .optional()
        .describe('URL to receive webhook payloads (required for create)'),
      format: z
        .enum(['raw', 'slack', 'ms_teams', 'pulumi_deployments'])
        .optional()
        .describe('Payload format (default: raw)'),
      filters: z.array(z.string()).optional().describe('Event type filters to subscribe to'),
      secret: z.string().optional().describe('Shared secret for HMAC signature verification'),
      webhookName: z
        .string()
        .optional()
        .describe(
          'Webhook name/ID. Required for delete; optionally assign a unique name during create.'
        ),
      active: z
        .boolean()
        .optional()
        .describe(
          'Whether deliveries are enabled when creating; defaults to true. Set false for an inactive webhook.'
        )
    })
  )
  .output(
    z.object({
      webhooks: z.array(z.any()).optional(),
      createdWebhook: z.any().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);
    if (!!ctx.input.projectName !== !!ctx.input.stackName)
      throw createApiServiceError(
        'Provide both projectName and stackName for a stack webhook, or omit both for an organization webhook.'
      );

    let isStackWebhook = !!(ctx.input.projectName && ctx.input.stackName);

    switch (ctx.input.action) {
      case 'list': {
        let webhooks: Awaited<ReturnType<Client['listOrgWebhooks']>>;
        if (isStackWebhook) {
          webhooks = await client.listStackWebhooks(
            org,
            ctx.input.projectName!,
            ctx.input.stackName!
          );
        } else {
          webhooks = await client.listOrgWebhooks(org);
        }
        return {
          output: { webhooks },
          message: `Found **${webhooks.length}** webhook(s)${isStackWebhook ? ` on stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**` : ` in organization **${org}**`}`
        };
      }
      case 'create': {
        if (!ctx.input.displayName)
          throw createApiServiceError('displayName is required when creating a webhook');
        if (!ctx.input.payloadUrl)
          throw createApiServiceError('payloadUrl is required when creating a webhook');

        let body = {
          active: ctx.input.active ?? true,
          displayName: ctx.input.displayName,
          payloadUrl: ctx.input.payloadUrl,
          format: ctx.input.format || 'raw',
          filters: ctx.input.filters,
          secret: ctx.input.secret,
          name: ctx.input.webhookName
        };

        let createdWebhook: Awaited<ReturnType<Client['createOrgWebhook']>>;
        if (isStackWebhook) {
          createdWebhook = await client.createStackWebhook(
            org,
            ctx.input.projectName!,
            ctx.input.stackName!,
            body
          );
        } else {
          createdWebhook = await client.createOrgWebhook(org, body);
        }

        return {
          output: { createdWebhook },
          message: `Created webhook **${ctx.input.displayName}**${isStackWebhook ? ` on stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**` : ` in organization **${org}**`}`
        };
      }
      case 'delete': {
        if (!ctx.input.webhookName)
          throw createApiServiceError('webhookName is required when deleting a webhook');

        if (isStackWebhook) {
          await client.deleteStackWebhook(
            org,
            ctx.input.projectName!,
            ctx.input.stackName!,
            ctx.input.webhookName
          );
        } else {
          await client.deleteOrgWebhook(org, ctx.input.webhookName);
        }

        return {
          output: { deleted: true },
          message: `Deleted webhook **${ctx.input.webhookName}**${isStackWebhook ? ` from stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**` : ` from organization **${org}**`}`
        };
      }
    }
  })
  .build();
