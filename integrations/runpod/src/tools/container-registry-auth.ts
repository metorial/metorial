import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

let registrySchema = z.object({ containerRegistryAuthId: z.string(), name: z.string() });

export let listContainerRegistryAuths = SlateTool.create(spec, {
  key: 'list_container_registry_auths',
  name: 'List Container Registry Credentials',
  description:
    'List saved private container registry credentials. Use their IDs when creating or updating templates and Pods. Passwords and usernames are never returned.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ registries: z.array(registrySchema) }))
  .handleInvocation(async ctx => {
    let values = await new RunPodClient(ctx.auth).listContainerRegistryAuths();
    let registries = values.map((value: { id: string; name: string }) => ({
      containerRegistryAuthId: value.id,
      name: value.name
    }));
    return {
      output: { registries },
      message: `Found ${registries.length} saved registry credentials.`
    };
  })
  .build();

export let manageContainerRegistryAuth = SlateTool.create(spec, {
  key: 'manage_container_registry_auth',
  name: 'Manage Container Registry Credentials',
  description:
    'Create, inspect, or delete private container registry credentials. Discover existing IDs with list_container_registry_auths. Deleting credentials can prevent deployments from pulling private images.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'delete']),
      containerRegistryAuthId: z
        .string()
        .min(1)
        .optional()
        .describe('Required for get and delete. Discover with list_container_registry_auths.'),
      name: z
        .string()
        .min(1)
        .max(191)
        .optional()
        .describe('Credential label; required for create.'),
      username: z
        .string()
        .min(1)
        .max(191)
        .optional()
        .describe('Registry username; required for create.'),
      password: z
        .string()
        .min(1)
        .max(16384)
        .optional()
        .describe('Registry password or access token; required for create.')
    })
  )
  .output(
    z.object({
      containerRegistryAuthId: z.string(),
      name: z.string().nullable(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient(ctx.auth);
    let { action, containerRegistryAuthId, name, username, password } = ctx.input;
    if (action === 'create') {
      if (!name || !username || !password)
        throw createApiServiceError('name, username, and password are required for create.');
      if (containerRegistryAuthId)
        throw createApiServiceError('Omit containerRegistryAuthId when creating credentials.');
      let value = await client.createContainerRegistryAuth({ name, username, password });
      return {
        output: { containerRegistryAuthId: value.id, name: value.name, action, success: true },
        message: `Created registry credentials ${value.name}.`
      };
    }
    if (!containerRegistryAuthId)
      throw createApiServiceError('containerRegistryAuthId is required for get or delete.');
    if (name !== undefined || username !== undefined || password !== undefined)
      throw createApiServiceError(
        'name, username, and password are only supported for create.'
      );
    if (action === 'delete') {
      await client.deleteContainerRegistryAuth(containerRegistryAuthId);
      return {
        output: { containerRegistryAuthId, name: null, action, success: true },
        message: `Deleted registry credentials ${containerRegistryAuthId}.`
      };
    }
    let value = await client.getContainerRegistryAuth(containerRegistryAuthId);
    return {
      output: { containerRegistryAuthId: value.id, name: value.name, action, success: true },
      message: `Retrieved registry credentials ${value.name}.`
    };
  })
  .build();
