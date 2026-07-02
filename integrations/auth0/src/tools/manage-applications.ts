import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let manageApplicationsTool = SlateTool.create(spec, {
  name: 'Manage Applications',
  key: 'manage_applications',
  description: `Create, update, delete, or list applications (clients) in Auth0. Applications represent the apps and services that use Auth0 for authentication. Supports native, SPA, regular web, and machine-to-machine app types.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      clientId: z
        .string()
        .optional()
        .describe('Application client ID (required for get, update, delete)'),
      name: z.string().optional().describe('Application name (required for create)'),
      appType: z
        .enum(['native', 'spa', 'regular_web', 'non_interactive'])
        .optional()
        .describe('Application type'),
      description: z.string().optional().describe('Application description'),
      callbacks: z.array(z.string()).optional().describe('Allowed callback URLs'),
      allowedOrigins: z.array(z.string()).optional().describe('Allowed origins for CORS'),
      webOrigins: z.array(z.string()).optional().describe('Allowed web origins'),
      allowedLogoutUrls: z
        .array(z.string())
        .optional()
        .describe('Allowed logout redirect URLs'),
      logoUri: z.string().optional().describe('URL for the application logo'),
      page: z.number().optional().describe('Page number (for list action)'),
      perPage: z.number().optional().describe('Results per page (for list action)')
    })
  )
  .output(
    z.object({
      application: z
        .object({
          clientId: z.string(),
          name: z.string(),
          appType: z.string().optional(),
          description: z.string().optional(),
          callbacks: z.array(z.string()).optional()
        })
        .optional()
        .describe('Application details'),
      applications: z
        .array(
          z.object({
            clientId: z.string(),
            name: z.string(),
            appType: z.string().optional(),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('List of applications'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let mapApp = (a: any) => ({
      clientId: a.client_id,
      name: a.name,
      appType: a.app_type,
      description: a.description,
      callbacks: a.callbacks
    });

    if (ctx.input.action === 'list') {
      let result = await client.listClients({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let apps = (Array.isArray(result) ? result : (result.clients ?? [])).map(mapApp);
      return {
        output: {
          applications: apps.map((a: any) => ({
            clientId: a.clientId,
            name: a.name,
            appType: a.appType,
            description: a.description
          }))
        },
        message: `Found **${apps.length}** application(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.clientId) throw new Error('clientId is required for get action');
      let app = await client.getClient(ctx.input.clientId);
      return {
        output: { application: mapApp(app) },
        message: `Retrieved application **${app.name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      let app = await client.createClient({
        name: ctx.input.name,
        appType: ctx.input.appType,
        description: ctx.input.description,
        callbacks: ctx.input.callbacks,
        allowedOrigins: ctx.input.allowedOrigins,
        webOrigins: ctx.input.webOrigins,
        allowedLogoutUrls: ctx.input.allowedLogoutUrls,
        logoUri: ctx.input.logoUri
      });
      return {
        output: { application: mapApp(app) },
        message: `Created application **${app.name}** (${app.app_type || 'default'}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.clientId) throw new Error('clientId is required for update action');
      let app = await client.updateClient(ctx.input.clientId, {
        name: ctx.input.name,
        appType: ctx.input.appType,
        description: ctx.input.description,
        callbacks: ctx.input.callbacks,
        allowedOrigins: ctx.input.allowedOrigins,
        webOrigins: ctx.input.webOrigins,
        allowedLogoutUrls: ctx.input.allowedLogoutUrls,
        logoUri: ctx.input.logoUri
      });
      return {
        output: { application: mapApp(app) },
        message: `Updated application **${app.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.clientId) throw new Error('clientId is required for delete action');
      await client.deleteClient(ctx.input.clientId);
      return {
        output: { deleted: true },
        message: `Deleted application **${ctx.input.clientId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
