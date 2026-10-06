import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateCollection = SlateTool.create(spec, {
  name: 'Update Collection',
  key: 'update_collection',
  description: `Update an existing collection's settings or add new properties. You can update the description, inverted index config, replication config, and add new properties.
The vectorizer cannot be changed and properties cannot be removed. Replication factor changes require replica movement.`,
  instructions: [
    'To add a new property, use the newProperties field.',
    'You cannot modify or remove existing properties.',
    'The vectorizer cannot be changed. Generative configuration is mutable on supported server versions.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection to update'),
      description: z.string().optional().describe('Updated description'),
      invertedIndexConfig: z.any().optional().describe('Updated inverted index configuration'),
      replicationConfig: z
        .object({
          factor: z.number().optional()
        })
        .optional()
        .describe('Updated replication settings'),
      newProperties: z
        .array(
          z.object({
            name: z.string().describe('Property name'),
            dataType: z.array(z.string()).describe('Data type(s)'),
            description: z.string().optional().describe('Property description'),
            tokenization: z.string().optional().describe('Tokenization strategy'),
            indexFilterable: z.boolean().optional(),
            indexSearchable: z.boolean().optional(),
            moduleConfig: z.any().optional(),
            nestedProperties: z
              .array(z.any())
              .optional()
              .describe('Nested property definitions for object or object[] types')
          })
        )
        .optional()
        .describe('New properties to add to the collection')
    })
  )
  .output(
    z
      .object({
        class: z.string().describe('Updated collection name'),
        propertiesAdded: z.number().describe('Number of new properties added')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { collectionName, newProperties, ...updates } = ctx.input;

    // Update collection settings if any non-property changes
    if (
      updates.description !== undefined ||
      updates.invertedIndexConfig ||
      updates.replicationConfig
    ) {
      let existing = await client.getCollection(collectionName);
      if (
        updates.replicationConfig?.factor !== undefined &&
        updates.replicationConfig.factor !== existing.replicationConfig?.factor
      ) {
        throw createApiServiceError(
          'Replication factor cannot be changed through collection schema updates. Use Weaviate replica movement.'
        );
      }
      let updatePayload: Record<string, any> = {
        class: collectionName,
        ...existing
      };
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.invertedIndexConfig)
        updatePayload.invertedIndexConfig = {
          ...existing.invertedIndexConfig,
          ...updates.invertedIndexConfig
        };
      if (updates.replicationConfig)
        updatePayload.replicationConfig = {
          ...existing.replicationConfig,
          ...updates.replicationConfig
        };
      await client.updateCollection(collectionName, updatePayload);
    }

    // Add new properties individually
    let propertiesAdded = 0;
    if (newProperties && newProperties.length > 0) {
      for (let prop of newProperties) {
        await client.addProperty(collectionName, prop);
        propertiesAdded++;
      }
    }

    return {
      output: {
        class: collectionName,
        propertiesAdded
      },
      message: `Updated collection **${collectionName}**. ${propertiesAdded} new properties added.`
    };
  })
  .build();
