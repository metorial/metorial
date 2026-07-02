import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let manageApp = SlateTool.create(spec, {
  name: 'Manage App',
  key: 'manage_app',
  description: `Create, update, or delete an SSO-connected application in OneLogin. When creating, a connector ID and name are required. When updating, provide the app ID and any fields to change. When deleting, provide the app ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      appId: z.number().optional().describe('Application ID (required for update and delete)'),
      connectorId: z.number().optional().describe('Connector ID (required for create)'),
      name: z.string().optional().describe('Application name (required for create)'),
      description: z.string().optional().describe('Application description'),
      visible: z.boolean().optional().describe('Whether the app is visible in the portal'),
      policyId: z.number().optional().describe('Security policy ID to apply'),
      configuration: z
        .record(z.string(), z.any())
        .optional()
        .describe('App-specific configuration settings'),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom parameter mappings'),
      provisioning: z.record(z.string(), z.any()).optional().describe('Provisioning settings'),
      allowAssumedSignin: z.boolean().optional().describe('Allow assumed sign-in')
    })
  )
  .output(
    z.object({
      appId: z.number().optional().describe('Application ID'),
      name: z.string().optional().describe('Application name'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (ctx.input.action === 'create') {
      let body: Record<string, any> = {
        connector_id: ctx.input.connectorId,
        name: ctx.input.name
      };
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      if (ctx.input.visible !== undefined) body.visible = ctx.input.visible;
      if (ctx.input.policyId !== undefined) body.policy_id = ctx.input.policyId;
      if (ctx.input.configuration !== undefined) body.configuration = ctx.input.configuration;
      if (ctx.input.parameters !== undefined) body.parameters = ctx.input.parameters;
      if (ctx.input.provisioning !== undefined) body.provisioning = ctx.input.provisioning;
      if (ctx.input.allowAssumedSignin !== undefined)
        body.allow_assumed_signin = ctx.input.allowAssumedSignin;

      let result = await client.createApp(body);
      return {
        output: { appId: result.id, name: result.name, success: true },
        message: `Created app **${result.name}** (ID: ${result.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.appId) throw new Error('appId is required for update');
      let body: Record<string, any> = {};
      if (ctx.input.name !== undefined) body.name = ctx.input.name;
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      if (ctx.input.visible !== undefined) body.visible = ctx.input.visible;
      if (ctx.input.policyId !== undefined) body.policy_id = ctx.input.policyId;
      if (ctx.input.configuration !== undefined) body.configuration = ctx.input.configuration;
      if (ctx.input.parameters !== undefined) body.parameters = ctx.input.parameters;
      if (ctx.input.provisioning !== undefined) body.provisioning = ctx.input.provisioning;
      if (ctx.input.allowAssumedSignin !== undefined)
        body.allow_assumed_signin = ctx.input.allowAssumedSignin;

      let result = await client.updateApp(ctx.input.appId, body);
      return {
        output: { appId: result.id, name: result.name, success: true },
        message: `Updated app **${result.name}** (ID: ${result.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.appId) throw new Error('appId is required for delete');
      await client.deleteApp(ctx.input.appId);
      return {
        output: { appId: ctx.input.appId, success: true },
        message: `Deleted app **${ctx.input.appId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  });
