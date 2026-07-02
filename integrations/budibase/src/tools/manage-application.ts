import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let applicationOutputSchema = z.object({
  appId: z.string().describe('Unique identifier of the application'),
  name: z.string().describe('Name of the application'),
  url: z.string().describe('URL path for the application'),
  status: z.string().describe('Current status: "development" or "published"'),
  createdAt: z.string().optional().describe('ISO timestamp when the application was created'),
  updatedAt: z
    .string()
    .optional()
    .describe('ISO timestamp when the application was last updated'),
  version: z.string().optional().describe('Budibase client version')
});

export let manageApplication = SlateTool.create(spec, {
  name: 'Manage Application',
  key: 'manage_application',
  description: `Create, retrieve, update, or delete a Budibase application. Use the **action** field to specify the operation.
For "create", provide a name. For "get", "update", or "delete", provide the appId. For "update", include the fields to change.`,
  instructions: [
    'To create an app, set action to "create" and provide a name.',
    'To update an app, set action to "update" and provide the appId along with the fields to change.',
    'The appId typically starts with "app_" for published apps or "app_dev_" for development apps.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete'])
        .describe('The operation to perform'),
      appId: z
        .string()
        .optional()
        .describe('Application ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Application name (required for create, optional for update)'),
      url: z
        .string()
        .optional()
        .describe('URL-encoded path for the application (optional for create and update)')
    })
  )
  .output(
    z.object({
      application: applicationOutputSchema
        .optional()
        .describe('The application data (not returned for delete)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the application was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let { action, appId, name, url } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('Name is required to create an application');
      let app = await client.createApplication({ name, url });
      let mapped = {
        appId: app._id,
        name: app.name,
        url: app.url,
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        version: app.version
      };
      return {
        output: { application: mapped },
        message: `Created application **${mapped.name}** (${mapped.appId}).`
      };
    }

    if (!appId) throw new Error('appId is required for get, update, and delete actions');

    if (action === 'get') {
      let app = await client.getApplication(appId);
      let mapped = {
        appId: app._id,
        name: app.name,
        url: app.url,
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        version: app.version
      };
      return {
        output: { application: mapped },
        message: `Retrieved application **${mapped.name}** (${mapped.appId}), status: ${mapped.status}.`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (url !== undefined) updateData.url = url;
      let app = await client.updateApplication(appId, updateData);
      let mapped = {
        appId: app._id,
        name: app.name,
        url: app.url,
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        version: app.version
      };
      return {
        output: { application: mapped },
        message: `Updated application **${mapped.name}** (${mapped.appId}).`
      };
    }

    // delete
    await client.deleteApplication(appId);
    return {
      output: { deleted: true },
      message: `Deleted application **${appId}**.`
    };
  })
  .build();
