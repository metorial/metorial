import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

let registryCredentialSchema = z.object({
  credentialId: z.string().describe('Registry credential ID'),
  name: z.string().optional().describe('Credential name'),
  registry: z.string().optional().describe('Registry type'),
  username: z.string().optional().describe('Registry username'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let mapCredential = (value: any) => {
  let credential = value.registryCredential || value.credential || value;
  return {
    credentialId: credential.id,
    name: credential.name,
    registry: credential.registry,
    username: credential.username,
    updatedAt: credential.updatedAt
  };
};

export let manageRegistryCredentials = SlateTool.create(spec, {
  name: 'Manage Registry Credentials',
  key: 'manage_registry_credentials',
  description: `List, retrieve, create, update, or delete Render registry credentials for private image deployments. Create/update require the registry auth token but never return it in output.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Registry credential action'),
      credentialId: z.string().optional().describe('Credential ID for get/update/delete'),
      ownerId: z.string().optional().describe('Workspace ID for list/create'),
      name: z.string().optional().describe('Credential name'),
      registry: z
        .enum(['GITHUB', 'GITLAB', 'DOCKER', 'GOOGLE_ARTIFACT', 'AWS_ECR'])
        .optional()
        .describe('Registry type'),
      username: z.string().optional().describe('Registry username'),
      authToken: z.string().optional().describe('Registry auth token for create/update'),
      limit: z.number().optional().describe('Maximum results for list'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      credentials: z.array(registryCredentialSchema).optional().describe('Credentials'),
      credential: registryCredentialSchema.optional().describe('Single credential'),
      cursor: z.string().optional().describe('Cursor for next page'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.ownerId) params.ownerId = [ctx.input.ownerId];
      if (ctx.input.name) params.name = [ctx.input.name];
      if (ctx.input.username) params.username = [ctx.input.username];
      if (ctx.input.registry) params.type = [ctx.input.registry];
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.cursor) params.cursor = ctx.input.cursor;
      let data = await client.listRegistryCredentials(params);
      let lastCursor: string | undefined;
      let credentials = (Array.isArray(data) ? data : []).map((item: any) => {
        lastCursor = item.cursor;
        return mapCredential(item);
      });
      return {
        output: { credentials, cursor: lastCursor, success: true },
        message: `Found **${credentials.length}** registry credential(s).`
      };
    }

    if (action === 'create') {
      for (let field of ['ownerId', 'name', 'registry', 'username', 'authToken'] as const) {
        if (!ctx.input[field]) throw createApiServiceError(`${field} is required for create`);
      }
      let credential = mapCredential(
        await client.createRegistryCredential({
          ownerId: ctx.input.ownerId,
          name: ctx.input.name,
          registry: ctx.input.registry,
          username: ctx.input.username,
          authToken: ctx.input.authToken
        })
      );
      return {
        output: { credential, success: true },
        message: `Created registry credential **${credential.name || credential.credentialId}**.`
      };
    }

    if (!ctx.input.credentialId) {
      throw createApiServiceError('credentialId is required');
    }

    if (action === 'get') {
      let credential = mapCredential(
        await client.getRegistryCredential(ctx.input.credentialId)
      );
      return {
        output: { credential, success: true },
        message: `Registry credential **${credential.name || credential.credentialId}**.`
      };
    }

    if (action === 'update') {
      for (let field of ['name', 'registry', 'username', 'authToken'] as const) {
        if (!ctx.input[field]) throw createApiServiceError(`${field} is required for update`);
      }
      let credential = mapCredential(
        await client.updateRegistryCredential(ctx.input.credentialId, {
          name: ctx.input.name,
          registry: ctx.input.registry,
          username: ctx.input.username,
          authToken: ctx.input.authToken
        })
      );
      return {
        output: { credential, success: true },
        message: `Updated registry credential **${credential.name || credential.credentialId}**.`
      };
    }

    await client.deleteRegistryCredential(ctx.input.credentialId);
    return {
      output: { success: true },
      message: `Deleted registry credential \`${ctx.input.credentialId}\`.`
    };
  })
  .build();
