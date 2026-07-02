import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageApiTool = SlateTool.create(spec, {
  name: 'Manage API',
  key: 'manage_api',
  description: `Create, get, update, list, or delete Postman APIs. APIs in Postman represent the full lifecycle definition of an API, including specifications, versions, and linked collections.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'list', 'delete'])
        .describe('Operation to perform'),
      apiId: z.string().optional().describe('API ID (required for get, update, delete)'),
      workspaceId: z.string().optional().describe('Workspace ID (used for create and list)'),
      name: z.string().optional().describe('API name (required for create)'),
      summary: z.string().optional().describe('Short API summary'),
      description: z.string().optional().describe('Full API description')
    })
  )
  .output(
    z.object({
      api: z.any().optional(),
      apis: z
        .array(
          z.object({
            apiId: z.string(),
            name: z.string().optional(),
            summary: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, apiId, workspaceId, name, summary, description } = ctx.input;

    if (action === 'list') {
      let apis = await client.listApis(workspaceId ? { workspace: workspaceId } : undefined);
      let result = apis.map((a: any) => ({
        apiId: a.id,
        name: a.name,
        summary: a.summary,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      }));
      return {
        output: { apis: result },
        message: `Found **${result.length}** API(s).`
      };
    }

    if (action === 'get') {
      if (!apiId) throw new Error('apiId is required for get.');
      let api = await client.getApi(apiId);
      return {
        output: { api },
        message: `Retrieved API **"${api?.name ?? apiId}"**.`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('name is required for create.');
      let api = await client.createApi({ name, summary, description }, workspaceId);
      return {
        output: { api },
        message: `Created API **"${name}"**.`
      };
    }

    if (action === 'update') {
      if (!apiId) throw new Error('apiId is required for update.');
      let api = await client.updateApi(apiId, { name, summary, description });
      return {
        output: { api },
        message: `Updated API **"${name ?? apiId}"**.`
      };
    }

    if (!apiId) throw new Error('apiId is required for delete.');
    await client.deleteApi(apiId);
    return {
      output: { api: { apiId } },
      message: `Deleted API **${apiId}**.`
    };
  })
  .build();
