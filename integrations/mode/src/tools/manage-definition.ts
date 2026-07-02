import { SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { getEmbedded, normalizeDefinition } from '../lib/helpers';
import { spec } from '../spec';

let definitionSchema = z.object({
  definitionToken: z.string().describe('Unique token of the definition'),
  name: z.string().describe('Name of the definition'),
  description: z.string().describe('Description of the definition'),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let listDefinitions = SlateTool.create(spec, {
  name: 'List Definitions',
  key: 'list_definitions',
  description: `List metric definitions in the workspace. Definitions provide a shared vocabulary for key metrics across the organization. Optionally filter by tokens.`,
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
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

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
  description: `Create, update, or delete a metric definition in the workspace.
Use **create** to add a new shared metric definition.
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
      description: z.string().optional().describe('Description of the definition')
    })
  )
  .output(definitionSchema)
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let raw = await client.createDefinition({
        name: ctx.input.name,
        description: ctx.input.description
      });
      let definition = normalizeDefinition(raw);
      return {
        output: definition,
        message: `Created definition **${definition.name}**.`
      };
    }

    if (action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.name !== undefined) body.name = ctx.input.name;
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      let raw = await client.updateDefinition(ctx.input.definitionToken!, body);
      let definition = normalizeDefinition(raw);
      return {
        output: definition,
        message: `Updated definition **${definition.name}**.`
      };
    }

    // delete
    let existing = await client.getDefinition(ctx.input.definitionToken!);
    let definition = normalizeDefinition(existing);
    await client.deleteDefinition(ctx.input.definitionToken!);
    return {
      output: definition,
      message: `Deleted definition **${definition.name}**.`
    };
  })
  .build();
