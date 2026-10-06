import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { branches, pagingOutput, resolveSpace, spaceIdInput } from '../lib/validation';
import { spec } from '../spec';

export let manageDatasource = SlateTool.create(spec, {
  name: 'Manage Datasource',
  key: 'manage_datasource',
  description: `Create, update, delete, or list datasources and their entries. Datasources are key-value stores useful for option lists, configuration values, and structured data.`,
  instructions: [
    'To **create** a datasource, set action to "create" and provide a name.',
    'To **update** a datasource, set action to "update" and provide the datasourceId plus fields to change.',
    'To **delete** a datasource, set action to "delete" and provide the datasourceId.',
    'To **list** all datasources, set action to "list".',
    'To manage individual entries within a datasource, use the **Manage Datasource Entry** tool.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      spaceId: spaceIdInput,
      action: z
        .enum(['create', 'update', 'delete', 'list', 'get'])
        .describe('The datasource action to perform'),
      datasourceId: z
        .string()
        .optional()
        .describe('Datasource ID (required for update, delete)'),
      name: z.string().optional().describe('Datasource name (required for create)'),
      slug: z.string().optional().describe('URL-friendly slug for the datasource'),
      page: z.number().optional().describe('Page for list; default 1'),
      perPage: z.number().optional().describe('Items per page for list; maximum 1000')
    })
  )
  .output(
    z.object({
      ...pagingOutput,
      datasourceId: z.number().optional().describe('ID of the affected datasource'),
      name: z.string().optional().describe('Name of the datasource'),
      slug: z.string().optional().describe('Slug of the datasource'),
      datasources: z
        .array(
          z.object({
            datasourceId: z.number().optional(),
            name: z.string().optional(),
            slug: z.string().optional()
          })
        )
        .optional()
        .describe('List of datasources (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    branches(
      ctx.input,
      {
        create: ['name', 'slug'],
        update: ['datasourceId', 'name', 'slug'],
        delete: ['datasourceId'],
        list: ['page', 'perPage'],
        get: ['datasourceId']
      }[ctx.input.action]
    );
    let client = new StoryblokClient({
      ...ctx.auth,
      spaceId: resolveSpace(
        ctx.input.spaceId,
        ctx.config.spaceId,
        ctx.auth.mode === 'oauth' ? ctx.auth.spaceId : undefined
      )
    });

    let { action, datasourceId } = ctx.input;

    if (action === 'list') {
      let result = await client.listDatasources(ctx.input);
      return {
        output: {
          ...result,
          datasources: result.datasources.map(d => ({
            datasourceId: d.id,
            name: d.name,
            slug: d.slug
          }))
        },
        message: `Found **${result.datasources.length}** datasources.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name)
        throw createApiServiceError('Name is required to create a datasource');
      let ds = await client.createDatasource({ name: ctx.input.name, slug: ctx.input.slug });
      return {
        output: { datasourceId: ds.id, name: ds.name, slug: ds.slug },
        message: `Created datasource **${ds.name}** (\`${ds.id}\`).`
      };
    }

    if (!datasourceId) throw createApiServiceError('datasourceId is required for this action');

    if (action === 'delete') {
      await client.deleteDatasource(datasourceId);
      return {
        output: { datasourceId: Number(datasourceId) },
        message: `Deleted datasource \`${datasourceId}\`.`
      };
    }

    // action === 'update'
    let ds =
      action === 'get'
        ? await client.getDatasource(datasourceId)
        : await client.updateDatasource(datasourceId, {
            name: ctx.input.name,
            slug: ctx.input.slug
          });
    return {
      output: { datasourceId: ds.id, name: ds.name, slug: ds.slug },
      message:
        action === 'get'
          ? 'Retrieved the exact datasource.'
          : `Updated datasource **${ds.name}** (\`${ds.id}\`).`
    };
  })
  .build();
