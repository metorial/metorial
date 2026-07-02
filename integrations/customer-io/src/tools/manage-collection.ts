import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { customerIoServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageCollection = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Create, update, or delete a collection in your Customer.io workspace. Collections store reusable data (promotions, events, courses, etc.) that you can reference in campaigns with Liquid. You can provide data as JSON or point to a URL for CSV/JSON data.`,
  instructions: [
    'For "create", provide a name and either jsonData or dataUrl.',
    'For "update", provide the collectionId and optionally a new name, jsonData, or dataUrl.',
    'For "delete", provide only the collectionId.'
  ],
  constraints: [
    'Collections must be smaller than 10 MB.',
    'Maximum 50 collections per workspace.',
    'Individual rows cannot exceed 10 KB.',
    'Available on Premium and Enterprise plans only.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      collectionId: z
        .string()
        .optional()
        .describe('The collection ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('The collection name (required for create, optional for update)'),
      jsonData: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of JSON objects as collection data'),
      dataUrl: z.string().optional().describe('URL to download CSV or JSON data from')
    })
  )
  .output(
    z.object({
      collectionId: z.string().optional().describe('The collection ID'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result: any;

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw customerIoServiceError('name is required to create a collection.');
      }
      if (ctx.input.jsonData && ctx.input.dataUrl) {
        throw customerIoServiceError('Provide only one of jsonData or dataUrl.');
      }
      if (!ctx.input.jsonData && !ctx.input.dataUrl) {
        throw customerIoServiceError(
          'jsonData or dataUrl is required to create a collection.'
        );
      }

      let data = ctx.input.jsonData ?? ctx.input.dataUrl!;
      result = await appClient.createCollection(ctx.input.name, data);
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.collectionId) {
        throw customerIoServiceError('collectionId is required to update a collection.');
      }
      if (ctx.input.jsonData && ctx.input.dataUrl) {
        throw customerIoServiceError('Provide only one of jsonData or dataUrl.');
      }
      if (!ctx.input.name && !ctx.input.jsonData && !ctx.input.dataUrl) {
        throw customerIoServiceError(
          'Provide name, jsonData, or dataUrl to update a collection.'
        );
      }

      result = await appClient.updateCollection(ctx.input.collectionId, {
        name: ctx.input.name,
        data: ctx.input.jsonData ?? ctx.input.dataUrl
      });
    } else {
      if (!ctx.input.collectionId) {
        throw customerIoServiceError('collectionId is required to delete a collection.');
      }

      await appClient.deleteCollection(ctx.input.collectionId);
      return {
        output: { collectionId: ctx.input.collectionId, success: true },
        message: `Deleted collection **${ctx.input.collectionId}**.`
      };
    }

    return {
      output: {
        collectionId: result?.collection?.id?.toString() ?? ctx.input.collectionId,
        success: true
      },
      message:
        ctx.input.action === 'create'
          ? `Created collection **${ctx.input.name}**.`
          : `Updated collection **${ctx.input.collectionId}**.`
    };
  })
  .build();
