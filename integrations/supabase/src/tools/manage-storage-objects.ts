import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { ProjectClient } from '../lib/project-client';
import { spec } from '../spec';

export let manageStorageObjects = SlateTool.create(spec, {
  name: 'Manage Storage Objects',
  key: 'manage_storage_objects',
  description: `List, move, copy, or delete files in Supabase Storage buckets. Also generate public URLs or signed URLs for file access.`,
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
        .enum(['list', 'move', 'copy', 'delete', 'get_public_url', 'create_signed_url'])
        .describe('Action to perform'),
      bucketId: z.string().describe('Storage bucket ID'),
      prefix: z.string().optional().describe('Path prefix for listing objects'),
      limit: z.number().optional().describe('Maximum number of objects to return (for list)'),
      offset: z.number().optional().describe('Offset for pagination (for list)'),
      paths: z.array(z.string()).optional().describe('File paths to delete (for delete)'),
      sourceKey: z.string().optional().describe('Source file path (for move, copy)'),
      destinationKey: z.string().optional().describe('Destination file path (for move, copy)'),
      path: z
        .string()
        .optional()
        .describe('File path (for get_public_url, create_signed_url)'),
      expiresIn: z
        .number()
        .optional()
        .describe('Signed URL expiration time in seconds (for create_signed_url)')
    })
  )
  .output(
    z.object({
      objects: z
        .array(
          z.object({
            name: z.string().describe('Object name'),
            objectId: z.string().optional().describe('Object ID'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp'),
            size: z.number().optional().describe('File size in bytes'),
            mimeType: z.string().optional().describe('MIME type')
          })
        )
        .optional()
        .describe('List of objects'),
      url: z.string().optional().describe('Generated URL (public or signed)'),
      moved: z.boolean().optional().describe('Whether the object was moved'),
      copied: z.boolean().optional().describe('Whether the object was copied'),
      deleted: z.boolean().optional().describe('Whether objects were deleted')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = ctx.input.projectRef ?? ctx.config.projectRef;
    if (!projectRef) {
      throw new Error(
        'projectRef is required — provide it as input or set it in the configuration'
      );
    }

    let mgmt = new ManagementClient(ctx.auth.token);
    let keys = await mgmt.getProjectApiKeys(projectRef);
    let serviceKey = (Array.isArray(keys) ? keys : []).find(
      (k: any) => k.name === 'service_role'
    );
    let apiKey = serviceKey?.api_key;

    if (!apiKey) {
      throw new Error('Could not retrieve service_role API key for the project');
    }

    let projectClient = new ProjectClient(projectRef, apiKey);
    let { action, bucketId } = ctx.input;

    if (action === 'list') {
      let data = await projectClient.listStorageObjects(bucketId, {
        prefix: ctx.input.prefix,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let objects = (Array.isArray(data) ? data : []).map((o: any) => ({
        name: o.name ?? '',
        objectId: o.id ?? undefined,
        createdAt: o.created_at ?? undefined,
        updatedAt: o.updated_at ?? undefined,
        size: o.metadata?.size ?? undefined,
        mimeType: o.metadata?.mimetype ?? undefined
      }));

      return {
        output: { objects },
        message: `Found **${objects.length}** objects in bucket **${bucketId}**.`
      };
    }

    if (action === 'move') {
      if (!ctx.input.sourceKey || !ctx.input.destinationKey) {
        throw new Error('sourceKey and destinationKey are required for move action');
      }
      await projectClient.moveStorageObject(
        bucketId,
        ctx.input.sourceKey,
        ctx.input.destinationKey
      );
      return {
        output: { moved: true },
        message: `Moved **${ctx.input.sourceKey}** to **${ctx.input.destinationKey}** in bucket **${bucketId}**.`
      };
    }

    if (action === 'copy') {
      if (!ctx.input.sourceKey || !ctx.input.destinationKey) {
        throw new Error('sourceKey and destinationKey are required for copy action');
      }
      await projectClient.copyStorageObject(
        bucketId,
        ctx.input.sourceKey,
        ctx.input.destinationKey
      );
      return {
        output: { copied: true },
        message: `Copied **${ctx.input.sourceKey}** to **${ctx.input.destinationKey}** in bucket **${bucketId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.paths || ctx.input.paths.length === 0) {
        throw new Error('paths are required for delete action');
      }
      await projectClient.deleteStorageObjects(bucketId, ctx.input.paths);
      return {
        output: { deleted: true },
        message: `Deleted **${ctx.input.paths.length}** objects from bucket **${bucketId}**.`
      };
    }

    if (action === 'get_public_url') {
      if (!ctx.input.path) throw new Error('path is required for get_public_url action');
      let url = await projectClient.getPublicUrl(bucketId, ctx.input.path);
      return {
        output: { url },
        message: `Public URL: ${url}`
      };
    }

    // create_signed_url
    if (!ctx.input.path) throw new Error('path is required for create_signed_url action');
    let result = await projectClient.createSignedUrl(
      bucketId,
      ctx.input.path,
      ctx.input.expiresIn ?? 3600
    );
    let signedUrl = result?.signedURL ?? result?.signedUrl ?? '';
    return {
      output: { url: signedUrl },
      message: `Created signed URL for **${ctx.input.path}** (expires in ${ctx.input.expiresIn ?? 3600}s).`
    };
  })
  .build();
