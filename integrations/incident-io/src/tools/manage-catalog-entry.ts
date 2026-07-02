import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCatalogEntry = SlateTool.create(spec, {
  name: 'Manage Catalog Entry',
  key: 'manage_catalog_entry',
  description: `Create, update, or delete a catalog entry. Use **create** to add a new entry to a catalog type, **update** to modify an existing entry's name, external ID, aliases, or attributes, and **delete** to archive an entry.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      catalogEntryId: z.string().optional().describe('Required for update and delete actions'),
      catalogTypeId: z.string().optional().describe('Required for the create action'),
      name: z.string().optional().describe('Name of the catalog entry (required for create)'),
      externalId: z.string().optional().describe('External identifier for the entry'),
      aliases: z.array(z.string()).optional().describe('Alternative names for the entry'),
      attributeValues: z
        .record(
          z.string(),
          z.object({
            value: z.object({
              literal: z.string().optional(),
              catalogEntryId: z.string().optional()
            })
          })
        )
        .optional()
        .describe('Attribute values keyed by attribute ID')
    })
  )
  .output(
    z.object({
      catalogEntryId: z.string().optional(),
      name: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let transformedAttributes:
      | Record<string, { value: { literal?: string; catalog_entry_id?: string } }>
      | undefined;
    if (input.attributeValues) {
      transformedAttributes = {};
      for (let [key, val] of Object.entries(input.attributeValues)) {
        transformedAttributes[key] = {
          value: {
            literal: val.value.literal,
            catalog_entry_id: val.value.catalogEntryId
          }
        };
      }
    }

    if (input.action === 'create') {
      if (!input.catalogTypeId || !input.name) {
        throw new Error('catalogTypeId and name are required for creating a catalog entry.');
      }
      let result = await client.createCatalogEntry({
        catalogTypeId: input.catalogTypeId,
        name: input.name,
        externalId: input.externalId,
        aliases: input.aliases,
        attributeValues: transformedAttributes
      });
      let entry = result.catalog_entry;
      return {
        output: { catalogEntryId: entry.id, name: entry.name },
        message: `Created catalog entry **${entry.name}**.`
      };
    }

    if (input.action === 'update') {
      if (!input.catalogEntryId) {
        throw new Error('catalogEntryId is required for updating a catalog entry.');
      }
      let result = await client.updateCatalogEntry(input.catalogEntryId, {
        name: input.name,
        externalId: input.externalId,
        aliases: input.aliases,
        attributeValues: transformedAttributes
      });
      let entry = result.catalog_entry;
      return {
        output: { catalogEntryId: entry.id, name: entry.name },
        message: `Updated catalog entry **${entry.name}**.`
      };
    }

    if (input.action === 'delete') {
      if (!input.catalogEntryId) {
        throw new Error('catalogEntryId is required for deleting a catalog entry.');
      }
      await client.deleteCatalogEntry(input.catalogEntryId);
      return {
        output: { catalogEntryId: input.catalogEntryId, deleted: true },
        message: `Deleted catalog entry ${input.catalogEntryId}.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
