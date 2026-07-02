import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let manageStorageBuckets = SlateTool.create(spec, {
  name: 'Manage Storage Buckets',
  key: 'manage_storage_buckets',
  description: `List, get, create, update, empty, or delete storage buckets in a Supabase project. Buckets organize files and control access policies.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (uses config.projectRef if not provided)'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'empty', 'delete'])
        .describe('Action to perform'),
      bucketId: z
        .string()
        .optional()
        .describe('Bucket ID (required for get, update, empty, delete)'),
      name: z.string().optional().describe('Bucket name (required for create)'),
      isPublic: z.boolean().optional().describe('Whether the bucket is publicly accessible'),
      fileSizeLimit: z.number().optional().describe('Maximum file size in bytes'),
      allowedMimeTypes: z
        .array(z.string())
        .optional()
        .describe('Allowed MIME types for uploads')
    })
  )
  .output(
    z.object({
      buckets: z
        .array(
          z.object({
            bucketId: z.string().describe('Bucket ID'),
            name: z.string().describe('Bucket name'),
            isPublic: z.boolean().describe('Whether the bucket is public'),
            fileSizeLimit: z.number().optional().describe('File size limit in bytes'),
            allowedMimeTypes: z.array(z.string()).optional().describe('Allowed MIME types'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of buckets (for list action)'),
      bucket: z
        .object({
          bucketId: z.string().describe('Bucket ID'),
          name: z.string().describe('Bucket name'),
          isPublic: z.boolean().describe('Whether the bucket is public'),
          fileSizeLimit: z.number().optional().describe('File size limit in bytes'),
          allowedMimeTypes: z.array(z.string()).optional().describe('Allowed MIME types'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
        .optional()
        .describe('Bucket details'),
      deleted: z.boolean().optional().describe('Whether the bucket was deleted'),
      emptied: z.boolean().optional().describe('Whether the bucket was emptied')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = ctx.input.projectRef ?? ctx.config.projectRef;
    if (!projectRef) {
      throw new Error(
        'projectRef is required — provide it as input or set it in the configuration'
      );
    }

    let client = new ManagementClient(ctx.auth.token);
    let { action } = ctx.input;

    let mapBucket = (b: any) => ({
      bucketId: b.id ?? '',
      name: b.name ?? '',
      isPublic: b.public ?? false,
      fileSizeLimit: b.file_size_limit ?? undefined,
      allowedMimeTypes: b.allowed_mime_types ?? undefined,
      createdAt: b.created_at ?? undefined
    });

    if (action === 'list') {
      let data = await client.listStorageBuckets(projectRef);
      let buckets = (Array.isArray(data) ? data : []).map(mapBucket);

      return {
        output: { buckets },
        message: `Found **${buckets.length}** storage buckets in project **${projectRef}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.bucketId) throw new Error('bucketId is required for get action');
      let b = await client.getStorageBucket(projectRef, ctx.input.bucketId);
      return {
        output: { bucket: mapBucket(b) },
        message: `Retrieved bucket **${b.name ?? ctx.input.bucketId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      let b = await client.createStorageBucket(projectRef, {
        name: ctx.input.name,
        public: ctx.input.isPublic,
        fileSizeLimit: ctx.input.fileSizeLimit,
        allowedMimeTypes: ctx.input.allowedMimeTypes
      });
      return {
        output: {
          bucket: mapBucket({
            ...b,
            name: ctx.input.name,
            public: ctx.input.isPublic ?? false
          })
        },
        message: `Created storage bucket **${ctx.input.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.bucketId) throw new Error('bucketId is required for update action');
      let b = await client.updateStorageBucket(projectRef, ctx.input.bucketId, {
        public: ctx.input.isPublic,
        fileSizeLimit: ctx.input.fileSizeLimit,
        allowedMimeTypes: ctx.input.allowedMimeTypes
      });
      return {
        output: { bucket: mapBucket(b) },
        message: `Updated storage bucket **${ctx.input.bucketId}**.`
      };
    }

    if (action === 'empty') {
      if (!ctx.input.bucketId) throw new Error('bucketId is required for empty action');
      await client.emptyStorageBucket(projectRef, ctx.input.bucketId);
      return {
        output: { emptied: true },
        message: `Emptied storage bucket **${ctx.input.bucketId}**.`
      };
    }

    // delete
    if (!ctx.input.bucketId) throw new Error('bucketId is required for delete action');
    await client.deleteStorageBucket(projectRef, ctx.input.bucketId);
    return {
      output: { deleted: true },
      message: `Deleted storage bucket **${ctx.input.bucketId}**.`
    };
  })
  .build();
