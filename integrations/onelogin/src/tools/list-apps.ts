import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `List SSO-connected applications in OneLogin. Filter by name (wildcards supported), connector ID, or authentication method. Returns app metadata including auth method, visibility, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by app name (supports wildcards *)'),
      connectorId: z.number().optional().describe('Filter by connector ID'),
      authMethod: z
        .number()
        .optional()
        .describe(
          'Filter by auth method (0=Password, 1=OpenId, 2=SAML, 3=API, 4=Google, 6=Forms, 7=WSFED, 8=OpenIdConnect)'
        )
    })
  )
  .output(
    z.object({
      apps: z
        .array(
          z.object({
            appId: z.number().describe('Application ID'),
            name: z.string().describe('Application name'),
            connectorId: z.number().nullable().optional().describe('Connector ID'),
            description: z.string().nullable().optional().describe('App description'),
            authMethod: z.number().nullable().optional().describe('Authentication method'),
            visible: z
              .boolean()
              .nullable()
              .optional()
              .describe('Whether the app is visible in the portal'),
            createdAt: z.string().nullable().optional().describe('ISO8601 creation timestamp'),
            updatedAt: z
              .string()
              .nullable()
              .optional()
              .describe('ISO8601 last update timestamp')
          })
        )
        .describe('List of applications')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let params: Record<string, string | number | undefined> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.connectorId) params.connector_id = ctx.input.connectorId;
    if (ctx.input.authMethod !== undefined) params.auth_method = ctx.input.authMethod;

    let data = await client.listApps(params);
    let apps = Array.isArray(data) ? data : data.data || [];

    let mapped = apps.map((a: any) => ({
      appId: a.id,
      name: a.name,
      connectorId: a.connector_id,
      description: a.description,
      authMethod: a.auth_method,
      visible: a.visible,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    return {
      output: { apps: mapped },
      message: `Found **${mapped.length}** application(s).`
    };
  });
