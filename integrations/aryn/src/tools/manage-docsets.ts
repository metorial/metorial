import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let docsetSchema = z.object({
  docsetId: z.string().describe('Unique identifier of the DocSet'),
  accountId: z.string().optional().describe('Account that owns the DocSet'),
  name: z.string().describe('Name of the DocSet'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  isReadonly: z.boolean().optional().describe('Whether the DocSet is read-only'),
  documentCount: z.number().optional().describe('Number of documents in the DocSet'),
  properties: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom properties of the DocSet'),
  schema: z.any().optional().describe('Schema definition for the DocSet')
});

let mapDocset = (d: any) => ({
  docsetId: d.docset_id,
  accountId: d.account_id,
  name: d.name,
  createdAt: d.created_at,
  isReadonly: d.readonly,
  documentCount: d.size,
  properties: d.properties,
  schema: d.schema
});

export let listDocsets = SlateTool.create(spec, {
  name: 'List DocSets',
  key: 'list_docsets',
  description: `List all DocSets in the account. DocSets are collections of parsed documents, similar to folders. Supports filtering by name and pagination.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      nameFilter: z.string().optional().describe('Filter DocSets by exact name match'),
      pageSize: z.number().optional().describe('Number of results per page (default: 100)'),
      pageToken: z.string().optional().describe('Pagination token for fetching next page')
    })
  )
  .output(
    z.object({
      docsets: z.array(docsetSchema).describe('List of DocSets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listDocsets({
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken,
      nameEq: ctx.input.nameFilter
    });

    let docsets = (Array.isArray(result) ? result : []).map(mapDocset);

    return {
      output: { docsets },
      message: `Found **${docsets.length}** DocSet(s).`
    };
  })
  .build();

export let getDocset = SlateTool.create(spec, {
  name: 'Get DocSet',
  key: 'get_docset',
  description: `Retrieve detailed metadata for a specific DocSet, including its schema, properties, and document count.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet to retrieve')
    })
  )
  .output(docsetSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getDocset(ctx.input.docsetId);

    return {
      output: mapDocset(result),
      message: `Retrieved DocSet **${result.name}** with ${result.size ?? 'unknown number of'} document(s).`
    };
  })
  .build();

export let createDocset = SlateTool.create(spec, {
  name: 'Create DocSet',
  key: 'create_docset',
  description: `Create a new DocSet to store and organize parsed documents. Optionally define a schema for metadata properties and custom properties.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new DocSet'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom properties for the DocSet'),
      schema: z
        .object({
          properties: z.array(
            z.object({
              name: z.string().describe('Property name'),
              fieldType: z.string().describe('Property type: String, Number, or Boolean'),
              description: z.string().optional().describe('Description of the property'),
              defaultValue: z.string().optional().describe('Default value'),
              examples: z.array(z.string()).optional().describe('Example values')
            })
          )
        })
        .optional()
        .describe('Schema defining properties that can be extracted from documents')
    })
  )
  .output(docsetSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let schemaInput = ctx.input.schema
      ? {
          properties: ctx.input.schema.properties.map(p => ({
            name: p.name,
            field_type: p.fieldType,
            description: p.description,
            default: p.defaultValue,
            examples: p.examples
          }))
        }
      : undefined;

    let result = await client.createDocset({
      name: ctx.input.name,
      properties: ctx.input.properties,
      schema: schemaInput
    });

    return {
      output: mapDocset(result),
      message: `Created DocSet **${result.name}** (ID: \`${result.docset_id}\`).`
    };
  })
  .build();

export let updateDocset = SlateTool.create(spec, {
  name: 'Update DocSet',
  key: 'update_docset',
  description: `Update a DocSet's metadata including name and custom properties. Note that fields like prompts are replaced entirely (not merged).`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet to update'),
      name: z.string().optional().describe('New name for the DocSet'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated properties (replaces existing)')
    })
  )
  .output(docsetSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.updateDocset(ctx.input.docsetId, {
      name: ctx.input.name,
      properties: ctx.input.properties
    });

    return {
      output: mapDocset(result),
      message: `Updated DocSet **${result.name}**.`
    };
  })
  .build();

export let deleteDocset = SlateTool.create(spec, {
  name: 'Delete DocSet',
  key: 'delete_docset',
  description: `Delete a DocSet and all its documents. This action is irreversible.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet to delete')
    })
  )
  .output(docsetSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.deleteDocset(ctx.input.docsetId);

    return {
      output: mapDocset(result),
      message: `Deleted DocSet **${result.name}** (ID: \`${result.docset_id}\`).`
    };
  })
  .build();
