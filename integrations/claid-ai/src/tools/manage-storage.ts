import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageStorage = SlateTool.create(spec, {
  name: 'Manage Storage',
  key: 'manage_storage',
  description: `Manage cloud storage connectors for use as image input/output sources. Supports listing, creating, updating, and deleting storage connections for AWS S3, Google Cloud Storage, and Web Folders.

Use the appropriate **action** to list, create, get, update, or delete storage connectors.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      storageId: z
        .number()
        .optional()
        .describe('Storage ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Storage name (required for create, optional for update)'),
      storageType: z
        .enum(['s3', 'gcs', 'web_folder'])
        .optional()
        .describe('Storage type (required for create)'),
      bucket: z.string().optional().describe('S3 or GCS bucket name'),
      path: z.string().optional().describe('Path within the bucket'),
      accessKey: z.string().optional().describe('Access key for S3 or GCS credentials'),
      secretAccessKey: z
        .string()
        .optional()
        .describe('Secret access key for S3 or GCS credentials'),
      baseUrl: z.string().optional().describe('Base URL for web folder storage')
    })
  )
  .output(
    z.object({
      storages: z
        .array(
          z.object({
            storageId: z.number().describe('Storage ID'),
            name: z.string().describe('Storage name'),
            storageType: z.string().describe('Storage type (s3, gcs, web_folder)'),
            parameters: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Storage configuration parameters'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of storages (for list/get actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the storage was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let action = ctx.input.action;

    if (action === 'list') {
      ctx.info('Listing storage connectors');
      let result = await client.listStorages();
      let storages = (result.data || []).map((s: any) => ({
        storageId: s.id,
        name: s.name,
        storageType: s.type,
        parameters: s.parameters,
        createdAt: s.created_at
      }));

      return {
        output: { storages },
        message: `Found **${storages.length}** storage connector(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.storageId) throw new Error('storageId is required for get action');
      ctx.info(`Getting storage connector ${ctx.input.storageId}`);
      let result = await client.getStorage(ctx.input.storageId);
      let s = result.data;

      return {
        output: {
          storages: [
            {
              storageId: s.id,
              name: s.name,
              storageType: s.type,
              parameters: s.parameters,
              createdAt: s.created_at
            }
          ]
        },
        message: `Storage **${s.name}** (${s.type}, ID: ${s.id}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      if (!ctx.input.storageType) throw new Error('storageType is required for create action');

      let parameters: Record<string, unknown> = {};

      if (ctx.input.storageType === 'web_folder') {
        if (!ctx.input.baseUrl) throw new Error('baseUrl is required for web_folder storage');
        parameters.base_url = ctx.input.baseUrl;
      } else {
        if (ctx.input.bucket) parameters.bucket = ctx.input.bucket;
        if (ctx.input.path) parameters.path = ctx.input.path;
        if (ctx.input.accessKey && ctx.input.secretAccessKey) {
          parameters.credentials = {
            access_key: ctx.input.accessKey,
            secret_access_key: ctx.input.secretAccessKey
          };
        }
      }

      ctx.info(`Creating ${ctx.input.storageType} storage "${ctx.input.name}"`);
      let result = await client.createStorage({
        name: ctx.input.name,
        type: ctx.input.storageType,
        parameters
      });

      let s = result.data;
      return {
        output: {
          storages: [
            {
              storageId: s.id,
              name: s.name,
              storageType: s.type,
              parameters: s.parameters,
              createdAt: s.created_at
            }
          ]
        },
        message: `Created storage **${s.name}** (${s.type}, ID: ${s.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.storageId) throw new Error('storageId is required for update action');

      let updateParams: Record<string, unknown> = {};
      if (ctx.input.name) updateParams.name = ctx.input.name;
      if (ctx.input.storageType) updateParams.type = ctx.input.storageType;

      let parameters: Record<string, unknown> = {};
      let hasParams = false;
      if (ctx.input.bucket) {
        parameters.bucket = ctx.input.bucket;
        hasParams = true;
      }
      if (ctx.input.path) {
        parameters.path = ctx.input.path;
        hasParams = true;
      }
      if (ctx.input.baseUrl) {
        parameters.base_url = ctx.input.baseUrl;
        hasParams = true;
      }
      if (ctx.input.accessKey && ctx.input.secretAccessKey) {
        parameters.credentials = {
          access_key: ctx.input.accessKey,
          secret_access_key: ctx.input.secretAccessKey
        };
        hasParams = true;
      }
      if (hasParams) updateParams.parameters = parameters;

      ctx.info(`Updating storage connector ${ctx.input.storageId}`);
      let result = await client.updateStorage(ctx.input.storageId, updateParams);

      let s = result.data;
      return {
        output: {
          storages: [
            {
              storageId: s.id,
              name: s.name,
              storageType: s.type,
              parameters: s.parameters,
              createdAt: s.created_at
            }
          ]
        },
        message: `Updated storage **${s.name}** (ID: ${s.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.storageId) throw new Error('storageId is required for delete action');

      ctx.info(`Deleting storage connector ${ctx.input.storageId}`);
      await client.deleteStorage(ctx.input.storageId);

      return {
        output: { deleted: true },
        message: `Deleted storage connector **${ctx.input.storageId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
