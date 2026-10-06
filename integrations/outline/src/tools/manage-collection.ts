import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { collectionOutput, mapCollection } from '../lib/schemas';
import { rejectFields, requireValue } from '../lib/validation';
import { spec } from '../spec';
export const manageCollection = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description:
    'Create, read, update or delete a collection. Set permission:null to remove default workspace access. Deleting a collection also affects its documents.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'get']),
      collectionId: z
        .string()
        .optional()
        .describe(
          'Exact collection ID, required except for create; discover with list_collections'
        ),
      name: z.string().optional().describe('Name, required for create'),
      description: z.string().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
      permission: z
        .enum(['read', 'read_write'])
        .nullable()
        .optional()
        .describe('Default workspace access; null means no default access'),
      sharing: z
        .boolean()
        .optional()
        .describe('Whether public sharing is allowed in this collection')
    })
  )
  .output(
    z.object({
      collectionId: z.string(),
      name: z.string().optional(),
      action: z.string(),
      success: z.boolean(),
      collection: collectionOutput.optional()
    })
  )
  .handleInvocation(async ctx => {
    const { action, collectionId, ...input } = ctx.input;
    const fields = ['name', 'description', 'color', 'icon', 'permission', 'sharing'];
    rejectFields(ctx.input, [
      'action',
      ...(action === 'create'
        ? fields
        : ['collectionId', ...(action === 'update' ? fields : [])])
    ]);
    requireValue(
      action === 'create' || collectionId,
      'Provide collectionId from list_collections.'
    );
    requireValue(
      action !== 'create' || !!input.name?.trim(),
      'Provide a nonempty collection name.'
    );
    requireValue(
      (input.name?.length ?? 0) <= 100 && (input.description?.length ?? 0) <= 100_000,
      'Use a name up to 100 characters and description up to 100,000 characters.'
    );
    requireValue(
      input.color === undefined || /^#[0-9a-f]{6}$/i.test(input.color),
      'Use a six-digit hex color such as #123456.'
    );
    requireValue(
      action !== 'update' || fields.some(k => input[k as keyof typeof input] !== undefined),
      'Provide at least one collection update field.'
    );
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    if (action === 'delete') {
      await client.deleteCollection(collectionId!);
      return {
        output: { collectionId: collectionId!, action, success: true },
        message:
          'Outline accepted collection deletion. Documents and event history follow the instance retention rules.'
      };
    }
    const collection =
      action === 'create'
        ? await client.createCollection(input)
        : action === 'update'
          ? await client.updateCollection({ ...input, id: collectionId! })
          : await client.getCollection(collectionId!);
    requireValue(
      (input.name === undefined || collection.name === input.name) &&
        (input.permission === undefined || collection.permission === input.permission) &&
        (input.sharing === undefined || collection.sharing === input.sharing),
      'Collection receipt differs from requested state. Read the exact collection before retrying.'
    );
    return {
      output: {
        collectionId: collection.id,
        name: collection.name,
        action,
        success: true,
        collection: mapCollection(collection)
      },
      message: `Outline confirmed collection ${action}.`
    };
  })
  .build();
