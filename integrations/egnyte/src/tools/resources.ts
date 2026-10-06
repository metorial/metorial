import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { bindId, invalid, record, requiredList, text } from '../lib/contracts';
import { spec } from '../spec';

export const getCurrentUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Identify the Egnyte user associated with this connection.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number(),
      username: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      userType: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const user = await new EgnyteClient(ctx.auth).getCurrentUser();
    return {
      output: {
        userId: Number(user.id),
        username: text(user.username),
        firstName: typeof user.first_name === 'string' ? user.first_name : undefined,
        lastName: typeof user.last_name === 'string' ? user.last_name : undefined,
        email: typeof user.email === 'string' ? user.email : undefined,
        userType: typeof user.user_type === 'string' ? user.user_type : undefined
      },
      message: `Connected as ${user.username}.`
    };
  })
  .build();

export const getResourceTool = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description:
    'Read one sharing link, custom group, metadata namespace definition, or exact file/folder metadata values.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resourceType: z.enum(['link', 'group', 'metadata_namespace', 'metadata_values']),
      resourceId: z
        .string()
        .optional()
        .describe('Exact link or group ID; file/folder ID for metadata values'),
      namespace: z
        .string()
        .optional()
        .describe('Namespace name for metadata definition or values'),
      targetType: z
        .enum(['file', 'folder'])
        .optional()
        .describe('Required for metadata values')
    })
  )
  .output(
    z.object({
      resourceType: z.string(),
      resourceId: z.string(),
      data: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    const client = new EgnyteClient(ctx.auth);
    const input = ctx.input;
    let data: Record<string, unknown>;
    let id: string;
    if (input.resourceType === 'metadata_namespace') {
      if (input.resourceId !== undefined || input.targetType !== undefined)
        throw invalid('A namespace definition uses only its namespace name.');
      id = text(input.namespace, 'namespace');
      data = bindId(await client.getNamespace(id), id, 'name');
    } else if (input.resourceType === 'metadata_values') {
      if (!input.targetType) throw invalid('Choose file or folder for metadata values.');
      id = text(input.resourceId);
      const namespace = text(input.namespace, 'namespace');
      if (input.targetType === 'file') await client.getFileById(id);
      else await client.getFolderById(id);
      data = await client.getProperties(input.targetType, id, namespace);
      requiredList(data.results).forEach(result => record(result[namespace]));
    } else {
      if (input.namespace !== undefined || input.targetType !== undefined)
        throw invalid('Link and group reads use only a resource ID.');
      id = text(input.resourceId);
      data =
        input.resourceType === 'link'
          ? await client.getLinkDetails(id)
          : await client.getGroup(id);
    }
    return {
      output: { resourceType: input.resourceType, resourceId: id, data },
      message: 'Retrieved the requested resource.'
    };
  })
  .build();

export const listResourcesTool = SlateTool.create(spec, {
  name: 'List Resources',
  key: 'list_resources',
  description:
    'Discover metadata namespaces or workflows visible to the connected user. Workflow listing returns one page; namespace discovery returns the provider list.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resourceType: z.enum(['metadata_namespaces', 'workflows']),
      offset: z.number().optional().describe('Workflow offset; not supported for namespaces'),
      count: z
        .number()
        .optional()
        .describe('Workflow page size, 1–25; not supported for namespaces')
    })
  )
  .output(
    z.object({
      resourceType: z.string(),
      resources: z.array(z.record(z.string(), z.unknown())),
      totalCount: z.number().optional(),
      offset: z.number().optional(),
      hasMore: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new EgnyteClient(ctx.auth);
    if (ctx.input.resourceType === 'metadata_namespaces') {
      if (ctx.input.offset !== undefined || ctx.input.count !== undefined)
        throw invalid('Namespace discovery does not accept pagination.');
      const resources = await client.listNamespaces();
      return {
        output: { resourceType: ctx.input.resourceType, resources },
        message: `Discovered ${resources.length} namespaces.`
      };
    }
    const page = await client.listWorkflows(ctx.input);
    const resources = requiredList(page.results);
    const offset = ctx.input.offset ?? 0;
    const totalCount = typeof page.totalCount === 'number' ? page.totalCount : undefined;
    return {
      output: {
        resourceType: ctx.input.resourceType,
        resources,
        totalCount,
        offset,
        hasMore: totalCount === undefined ? undefined : offset + resources.length < totalCount
      },
      message: `Retrieved ${resources.length} workflows.`
    };
  })
  .build();
