import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let getApp = SlateTool.create(spec, {
  name: 'Get App',
  key: 'get_app',
  description: `Retrieve detailed information about a specific OneLogin application by its ID. Returns full configuration including SSO settings, provisioning config, parameters, and role associations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z.number().describe('The ID of the application to retrieve')
    })
  )
  .output(
    z.object({
      appId: z.number().describe('Application ID'),
      name: z.string().describe('Application name'),
      connectorId: z.number().nullable().optional().describe('Connector ID'),
      description: z.string().nullable().optional().describe('Description'),
      notes: z.string().nullable().optional().describe('Notes'),
      iconUrl: z.string().nullable().optional().describe('Icon URL'),
      authMethod: z.number().nullable().optional().describe('Authentication method'),
      policyId: z.number().nullable().optional().describe('Security policy ID'),
      visible: z.boolean().nullable().optional().describe('Portal visibility'),
      roleIds: z.array(z.number()).nullable().optional().describe('Associated role IDs'),
      provisioning: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Provisioning settings'),
      sso: z.record(z.string(), z.any()).nullable().optional().describe('SSO configuration'),
      configuration: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('App-specific configuration'),
      parameters: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Custom parameter mappings'),
      createdAt: z.string().nullable().optional().describe('ISO8601 creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('ISO8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let a = await client.getApp(ctx.input.appId);

    return {
      output: {
        appId: a.id,
        name: a.name,
        connectorId: a.connector_id,
        description: a.description,
        notes: a.notes,
        iconUrl: a.icon_url,
        authMethod: a.auth_method,
        policyId: a.policy_id,
        visible: a.visible,
        roleIds: a.role_ids,
        provisioning: a.provisioning,
        sso: a.sso,
        configuration: a.configuration,
        parameters: a.parameters,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      },
      message: `Retrieved app **${a.name}** (ID: ${a.id}).`
    };
  });
