import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
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
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)'),
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
        .describe('Webhook name/ID to delete (required for delete)')
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
      baseUrl: ctx.config.baseUrl
    });

    let org = ctx.input.organization || ctx.config.organization;
    if (!org)
      throw new Error('Organization is required. Set it in config or provide it as input.');

    let isStackWebhook = !!(ctx.input.projectName && ctx.input.stackName);

    switch (ctx.input.action) {
      case 'list': {
        let webhooks: any[];
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
          output: { webhooks: webhooks || [] },
          message: `Found **${(webhooks || []).length}** webhook(s)${isStackWebhook ? ` on stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**` : ` in organization **${org}**`}`
        };
      }
      case 'create': {
        if (!ctx.input.displayName)
          throw new Error('displayName is required when creating a webhook');
        if (!ctx.input.payloadUrl)
          throw new Error('payloadUrl is required when creating a webhook');

        let body = {
          active: true,
          displayName: ctx.input.displayName,
          payloadUrl: ctx.input.payloadUrl,
          format: ctx.input.format || 'raw',
          filters: ctx.input.filters,
          secret: ctx.input.secret
        };

        let createdWebhook: any;
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
          throw new Error('webhookName is required when deleting a webhook');

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
