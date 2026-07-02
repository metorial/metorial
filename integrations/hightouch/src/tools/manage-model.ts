import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let modelSchema = z.object({
  modelId: z.number().describe('Unique ID of the model'),
  name: z.string().describe('Name of the model'),
  slug: z.string().describe('URL-friendly slug for the model'),
  sourceId: z.number().describe('ID of the source this model queries'),
  primaryKey: z
    .string()
    .nullable()
    .describe('Primary key column used for change data capture'),
  queryType: z.string().describe('Query type: custom, raw_sql, table, dbt, or visual'),
  isSchema: z.boolean().describe('Whether this model is used as a base for other models'),
  syncs: z.array(z.number()).optional().describe('IDs of syncs using this model'),
  tags: z.record(z.string(), z.string()).optional().describe('Key-value metadata tags'),
  raw: z.object({ sql: z.string() }).optional().describe('Raw SQL query definition'),
  table: z
    .object({ name: z.string() })
    .optional()
    .describe('Table name for table-based queries'),
  dbt: z.object({ modelId: z.string() }).optional().describe('dbt model reference'),
  custom: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom query for non-SQL sources'),
  visual: z.record(z.string(), z.any()).optional().describe('Visual query definition'),
  folderId: z.string().optional().nullable().describe('Folder ID for organizing models'),
  workspaceId: z.number().describe('ID of the workspace'),
  createdAt: z.string().describe('ISO timestamp when the model was created'),
  updatedAt: z.string().describe('ISO timestamp when the model was last updated')
});

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `List models in your Hightouch workspace. Models define which data to pull from a source. Supports filtering by name or slug and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max number of models to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
      orderBy: z
        .enum(['id', 'name', 'slug', 'createdAt', 'updatedAt'])
        .optional()
        .describe('Field to sort results by'),
      name: z.string().optional().describe('Filter models by name'),
      slug: z.string().optional().describe('Filter models by slug')
    })
  )
  .output(
    z.object({
      models: z.array(modelSchema).describe('List of models'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listModels(ctx.input);

    return {
      output: {
        models: result.data,
        hasMore: result.hasMore
      },
      message: `Found **${result.data.length}** model(s).${result.hasMore ? ' More results available.' : ''}`
    };
  })
  .build();

export let getModel = SlateTool.create(spec, {
  name: 'Get Model',
  key: 'get_model',
  description: `Retrieve details of a specific model by its ID, including the query definition, primary key, source, and associated syncs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.number().describe('ID of the model to retrieve')
    })
  )
  .output(modelSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let model = await client.getModel(ctx.input.modelId);

    return {
      output: model,
      message: `Retrieved model **${model.name}** (query type: ${model.queryType}, source ID: ${model.sourceId}).`
    };
  })
  .build();

export let createModel = SlateTool.create(spec, {
  name: 'Create Model',
  key: 'create_model',
  description: `Create a new model that defines which data to pull from a source. Models require a primary key for change data capture. Supports raw SQL, table, dbt, visual, and custom query types.`,
  instructions: [
    'Set queryType to "raw_sql" and provide the raw.sql field for SQL-based models.',
    'Set queryType to "table" and provide the table.name field for table-based models.',
    'Set queryType to "dbt" and provide the dbt.modelId field for dbt model references.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the model'),
      slug: z.string().describe('URL-friendly slug for the model'),
      sourceId: z.number().describe('ID of the source to query'),
      primaryKey: z.string().describe('Primary key column for change data capture'),
      queryType: z
        .enum(['raw_sql', 'table', 'dbt', 'custom', 'visual'])
        .describe('Type of query'),
      isSchema: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether this model is a schema model used as a base for other models'),
      raw: z
        .object({ sql: z.string().describe('SQL query string') })
        .optional()
        .describe('Raw SQL query (for queryType "raw_sql")'),
      table: z
        .object({ name: z.string().describe('Table name') })
        .optional()
        .describe('Table reference (for queryType "table")'),
      dbt: z
        .object({ modelId: z.string().describe('dbt model ID') })
        .optional()
        .describe('dbt model reference (for queryType "dbt")'),
      custom: z
        .object({ query: z.string().describe('Custom query') })
        .optional()
        .describe('Custom query for non-SQL sources'),
      visual: z
        .object({
          filter: z.string().describe('Filter expression'),
          parentId: z.string().describe('Parent model ID'),
          label: z.string().describe('Label for the visual query')
        })
        .optional()
        .describe('Visual query definition'),
      folderId: z.string().optional().describe('Folder ID for organization')
    })
  )
  .output(modelSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let model = await client.createModel(ctx.input);

    return {
      output: model,
      message: `Created model **${model.name}** (query type: ${model.queryType}, ID: ${model.modelId}).`
    };
  })
  .build();

export let updateModel = SlateTool.create(spec, {
  name: 'Update Model',
  key: 'update_model',
  description: `Update an existing model's name, primary key, query definition, or other properties.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      modelId: z.number().describe('ID of the model to update'),
      name: z.string().optional().describe('New name for the model'),
      primaryKey: z.string().optional().describe('Updated primary key column'),
      isSchema: z.boolean().optional().describe('Whether this model is a schema model'),
      raw: z.object({ sql: z.string() }).optional().describe('Updated raw SQL query'),
      table: z.object({ name: z.string() }).optional().describe('Updated table reference'),
      dbt: z
        .object({ modelId: z.string() })
        .optional()
        .describe('Updated dbt model reference'),
      custom: z.object({ query: z.string() }).optional().describe('Updated custom query'),
      visual: z
        .object({
          filter: z.string(),
          parentId: z.string(),
          label: z.string()
        })
        .optional()
        .describe('Updated visual query definition'),
      folderId: z.string().optional().describe('Updated folder ID')
    })
  )
  .output(modelSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { modelId, ...updateData } = ctx.input;
    let model = await client.updateModel(modelId, updateData);

    return {
      output: model,
      message: `Updated model **${model.name}** (ID: ${modelId}).`
    };
  })
  .build();
