import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
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
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'list'])
        .describe('The datasource action to perform'),
      datasourceId: z
        .string()
        .optional()
        .describe('Datasource ID (required for update, delete)'),
      name: z.string().optional().describe('Datasource name (required for create)'),
      slug: z.string().optional().describe('URL-friendly slug for the datasource')
    })
  )
  .output(
    z.object({
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
    let client = new StoryblokClient({
      token: ctx.auth.token,
      region: ctx.auth.region,
      spaceId: ctx.config.spaceId
    });

    let { action, datasourceId } = ctx.input;

    if (action === 'list') {
      let datasources = await client.listDatasources();
      return {
        output: {
          datasources: datasources.map(d => ({
            datasourceId: d.id,
            name: d.name,
            slug: d.slug
          }))
        },
        message: `Found **${datasources.length}** datasources.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required to create a datasource');
      let ds = await client.createDatasource({ name: ctx.input.name, slug: ctx.input.slug });
      return {
        output: { datasourceId: ds.id, name: ds.name, slug: ds.slug },
        message: `Created datasource **${ds.name}** (\`${ds.id}\`).`
      };
    }

    if (!datasourceId) throw new Error('datasourceId is required for this action');

    if (action === 'delete') {
      await client.deleteDatasource(datasourceId);
      return {
        output: { datasourceId: Number.parseInt(datasourceId, 10) },
        message: `Deleted datasource \`${datasourceId}\`.`
      };
    }

    // action === 'update'
    let ds = await client.updateDatasource(datasourceId, {
      name: ctx.input.name,
      slug: ctx.input.slug
    });
    return {
      output: { datasourceId: ds.id, name: ds.name, slug: ds.slug },
      message: `Updated datasource **${ds.name}** (\`${ds.id}\`).`
    };
  })
  .build();
