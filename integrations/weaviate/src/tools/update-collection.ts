import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateCollection = SlateTool.create(spec, {
  name: 'Update Collection',
  key: 'update_collection',
  description: `Update an existing collection's settings or add new properties. You can update the description, inverted index config, replication config, and add new properties.
Note: You **cannot change** the vectorizer, generative module, or existing properties after creation.`,
  instructions: [
    'To add a new property, use the newProperties field.',
    'You cannot modify or remove existing properties.',
    'Vectorizer and generative module cannot be changed.'
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
            moduleConfig: z.any().optional()
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
    if (updates.description || updates.invertedIndexConfig || updates.replicationConfig) {
      let existing = await client.getCollection(collectionName);
      let updatePayload: Record<string, any> = {
        class: collectionName,
        ...existing
      };
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.invertedIndexConfig)
        updatePayload.invertedIndexConfig = updates.invertedIndexConfig;
      if (updates.replicationConfig)
        updatePayload.replicationConfig = updates.replicationConfig;
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
