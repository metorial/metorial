import { SlateTool } from 'slates';
import { z } from 'zod';
import { TypesApiClient } from '../lib/client';
import { spec } from '../spec';

let customTypeOutputSchema = z.object({
  typeId: z.string().describe('Custom type ID'),
  label: z.string().describe('Human-readable label'),
  repeatable: z.boolean().describe('Whether multiple documents of this type can exist'),
  status: z.boolean().describe('Whether the custom type is active'),
  json: z.record(z.string(), z.any()).describe('JSON schema defining the type structure')
});

export let listCustomTypes = SlateTool.create(spec, {
  name: 'List Custom Types',
  key: 'list_custom_types',
  description: `List all custom types defined in the Prismic repository. Returns the schema and metadata for each type.
Requires a Write API token.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      customTypes: z
        .array(customTypeOutputSchema)
        .describe('All custom types in the repository')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing custom types.');
    }

    let client = new TypesApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    let types = await client.listCustomTypes();

    return {
      output: {
        customTypes: types.map(t => ({
          typeId: t.id,
          label: t.label,
          repeatable: t.repeatable,
          status: t.status,
          json: t.json
        }))
      },
      message: `Found **${types.length}** custom types.`
    };
  })
  .build();

export let getCustomType = SlateTool.create(spec, {
  name: 'Get Custom Type',
  key: 'get_custom_type',
  description: `Retrieve a specific custom type by its ID, including its full JSON schema definition.
Requires a Write API token.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      typeId: z.string().describe('The custom type ID to retrieve')
    })
  )
  .output(customTypeOutputSchema)
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing custom types.');
    }

    let client = new TypesApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    let t = await client.getCustomType(ctx.input.typeId);

    return {
      output: {
        typeId: t.id,
        label: t.label,
        repeatable: t.repeatable,
        status: t.status,
        json: t.json
      },
      message: `Retrieved custom type **${t.label}** (${t.id}).`
    };
  })
  .build();

export let createCustomType = SlateTool.create(spec, {
  name: 'Create Custom Type',
  key: 'create_custom_type',
  description: `Create a new custom type in the Prismic repository with the specified schema.
Requires a Write API token.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      typeId: z
        .string()
        .describe('Unique ID for the custom type (lowercase, hyphens allowed)'),
      label: z.string().describe('Human-readable label'),
      repeatable: z.boolean().describe('Whether multiple documents of this type can exist'),
      status: z.boolean().optional().describe('Whether the type is active (default true)'),
      json: z
        .record(z.string(), z.any())
        .describe('JSON schema defining the type structure (tabs with field definitions)')
    })
  )
  .output(customTypeOutputSchema)
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing custom types.');
    }

    let client = new TypesApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    let t = await client.createCustomType({
      id: ctx.input.typeId,
      label: ctx.input.label,
      repeatable: ctx.input.repeatable,
      status: ctx.input.status ?? true,
      json: ctx.input.json
    });

    return {
      output: {
        typeId: t.id,
        label: t.label,
        repeatable: t.repeatable,
        status: t.status,
        json: t.json
      },
      message: `Created custom type **${t.label}** (${t.id}).`
    };
  })
  .build();

export let updateCustomType = SlateTool.create(spec, {
  name: 'Update Custom Type',
  key: 'update_custom_type',
  description: `Update an existing custom type's schema, label, or status in the Prismic repository.
Requires a Write API token.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      typeId: z.string().describe('ID of the custom type to update'),
      label: z.string().describe('Updated human-readable label'),
      repeatable: z.boolean().describe('Whether multiple documents of this type can exist'),
      status: z.boolean().describe('Whether the type is active'),
      json: z.record(z.string(), z.any()).describe('Updated JSON schema')
    })
  )
  .output(customTypeOutputSchema)
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing custom types.');
    }

    let client = new TypesApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    let t = await client.updateCustomType({
      id: ctx.input.typeId,
      label: ctx.input.label,
      repeatable: ctx.input.repeatable,
      status: ctx.input.status,
      json: ctx.input.json
    });

    return {
      output: {
        typeId: t.id,
        label: t.label,
        repeatable: t.repeatable,
        status: t.status,
        json: t.json
      },
      message: `Updated custom type **${t.label}** (${t.id}).`
    };
  })
  .build();

export let deleteCustomType = SlateTool.create(spec, {
  name: 'Delete Custom Type',
  key: 'delete_custom_type',
  description: `Delete a custom type from the Prismic repository. This action is irreversible.
Requires a Write API token.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      typeId: z.string().describe('ID of the custom type to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the custom type was successfully deleted'),
      typeId: z.string().describe('ID of the deleted custom type')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing custom types.');
    }

    let client = new TypesApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    await client.deleteCustomType(ctx.input.typeId);

    return {
      output: {
        deleted: true,
        typeId: ctx.input.typeId
      },
      message: `Deleted custom type **${ctx.input.typeId}**.`
    };
  })
  .build();
