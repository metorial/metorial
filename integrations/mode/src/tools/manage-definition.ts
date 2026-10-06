import { SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient, requireToken } from '../lib/client';
import { getEmbedded, normalizeDefinition } from '../lib/helpers';
import { spec } from '../spec';

let definitionSchema = z.object({
  definitionToken: z.string().describe('Unique token of the definition'),
  name: z.string().describe('Name of the definition'),
  description: z.string().describe('Description of the definition'),
  createdAt: z.string(),
  updatedAt: z.string(),
  source: z.string().optional().describe('SQL SELECT statement'),
  dataSourceId: z.number().optional().describe('Numeric data source ID')
});

export let listDefinitions = SlateTool.create(spec, {
  name: 'List Definitions',
  key: 'list_definitions',
  description: `List SQL definitions in the workspace. Definitions store reusable SQL SELECT statements. Optionally filter by tokens.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tokens: z
        .string()
        .optional()
        .describe('Comma-separated list of definition tokens to filter by')
    })
  )
  .output(
    z.object({
      definitions: z.array(definitionSchema)
    })
  )
  .handleInvocation(async ctx => {
    const client = ModeClient.fromContext(ctx);

    let data = await client.listDefinitions({
      tokens: ctx.input.tokens
    });
    let definitions = getEmbedded(data, 'definitions').map(normalizeDefinition);

    return {
      output: { definitions },
      message: `Found **${definitions.length}** definitions.`
    };
  })
  .build();

export let manageDefinition = SlateTool.create(spec, {
  name: 'Manage Definition',
  key: 'manage_definition',
  description: `Create, update, or delete a SQL definition in the workspace.
Use **create** to add a new shared SQL definition.
Use **update** to modify an existing definition.
Use **delete** to remove a definition.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      definitionToken: z
        .string()
        .optional()
        .describe('Token of the definition (required for update/delete)'),
      name: z.string().optional().describe('Name of the definition'),
      description: z.string().optional().describe('Description of the definition'),
      source: z.string().optional().describe('SQL SELECT statement for the definition'),
      dataSourceId: z.number().optional().describe('Numeric ID of the associated data source')
    })
  )
  .output(definitionSchema)
  .handleInvocation(async ctx => {
    const client = ModeClient.fromContext(ctx);

    let { action } = ctx.input;

    if (action === 'create') {
      let raw = await client.createDefinition({
        name: ctx.input.name,
        description: ctx.input.description,
        source: ctx.input.source,
        data_source_id: ctx.input.dataSourceId
      });
      let definition = normalizeDefinition(raw);
      return {
        output: definition,
        message: `Created definition **${definition.name}**.`
      };
    }

    if (action === 'update') {
      const raw = await client.updateDefinition(
        requireToken(ctx.input.definitionToken, 'definitionToken'),
        {
          name: ctx.input.name,
          description: ctx.input.description,
          source: ctx.input.source,
          data_source_id: ctx.input.dataSourceId
        }
      );
      let definition = normalizeDefinition(raw);
      return {
        output: definition,
        message: `Updated definition **${definition.name}**.`
      };
    }

    // delete
    let existing = await client.getDefinition(
      requireToken(ctx.input.definitionToken, 'definitionToken')
    );
    let definition = normalizeDefinition(existing);
    await client.deleteDefinition(requireToken(ctx.input.definitionToken, 'definitionToken'));
    return {
      output: definition,
      message: `Deleted definition **${definition.name}**.`
    };
  })
  .build();
