import { createApiServiceError, createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { requireProjectRef } from '../lib/errors';
import { ProjectClient } from '../lib/project-client';
import { spec } from '../spec';

let normalizeBase64 = (value: string) => value.replace(/\s+/g, '').replace(/=+$/g, '');

let decodeBase64Content = (value: string, label: string) => {
  let buffer = Buffer.from(value, 'base64');
  if (
    buffer.length === 0 ||
    normalizeBase64(buffer.toString('base64')) !== normalizeBase64(value)
  ) {
    throw createApiServiceError(`${label} must be valid non-empty base64 data.`);
  }

  return buffer;
};

let getObjectContent = (input: { content?: string; contentBase64?: string }) => {
  if (input.content && input.contentBase64) {
    throw createApiServiceError('Provide only one of content or contentBase64.');
  }

  if (input.contentBase64) {
    return decodeBase64Content(input.contentBase64, 'contentBase64');
  }

  if (input.content !== undefined) {
    return input.content;
  }

  throw createApiServiceError('content or contentBase64 is required for this action.');
};

let mapObject = (o: any) => {
  let rawSize = o.metadata?.size ?? o.size;
  let size =
    typeof rawSize === 'number'
      ? rawSize
      : typeof rawSize === 'string'
        ? Number.parseInt(rawSize, 10)
        : undefined;

  return {
    name: o.name ?? o.Key ?? '',
    objectId: o.id ?? o.Id ?? undefined,
    createdAt: o.created_at ?? undefined,
    updatedAt: o.updated_at ?? o.last_modified ?? undefined,
    size: Number.isFinite(size) ? size : undefined,
    mimeType: o.metadata?.mimetype ?? o.mimetype ?? o.contentType ?? undefined
  };
};

export let manageStorageObjects = SlateTool.create(spec, {
  name: 'Manage Storage Objects',
  key: 'manage_storage_objects',
  description: `List, inspect, upload, update, download, move, copy, or delete files in Supabase Storage buckets. Also generate public URLs or signed URLs for file access.`,
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
        .enum([
          'list',
          'info',
          'upload',
          'update',
          'download',
          'move',
          'copy',
          'delete',
          'get_public_url',
          'create_signed_url'
        ])
        .describe('Action to perform'),
      bucketId: z.string().describe('Storage bucket ID'),
      prefix: z.string().optional().describe('Path prefix for listing objects'),
      search: z.string().optional().describe('Search term for listing objects'),
      limit: z.number().optional().describe('Maximum number of objects to return (for list)'),
      offset: z.number().optional().describe('Offset for pagination (for list)'),
      paths: z.array(z.string()).optional().describe('File paths to delete (for delete)'),
      sourceKey: z.string().optional().describe('Source file path (for move, copy)'),
      destinationKey: z.string().optional().describe('Destination file path (for move, copy)'),
      path: z
        .string()
        .optional()
        .describe(
          'File path (for info, upload, update, download, get_public_url, create_signed_url)'
        ),
      content: z
        .string()
        .optional()
        .describe('Text content to upload or update. Use either content or contentBase64.'),
      contentBase64: z
        .string()
        .optional()
        .describe(
          'Base64-encoded content to upload or update. Use either content or contentBase64.'
        ),
      contentType: z
        .string()
        .optional()
        .describe('MIME type for upload or update (defaults to application/octet-stream)'),
      cacheControl: z.string().optional().describe('Cache-Control value for upload or update'),
      upsert: z
        .boolean()
        .optional()
        .describe('For upload, overwrite an existing object when true'),
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
      object: z
        .object({
          name: z.string().describe('Object name'),
          objectId: z.string().optional().describe('Object ID'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp'),
          size: z.number().optional().describe('File size in bytes'),
          mimeType: z.string().optional().describe('MIME type')
        })
        .optional()
        .describe('Object details'),
      url: z.string().optional().describe('Generated URL (public or signed)'),
      contentType: z.string().optional().describe('Downloaded object MIME type'),
      contentLength: z.number().optional().describe('Downloaded object size in bytes'),
      attachmentCount: z.number().optional().describe('Number of returned attachments'),
      uploaded: z.boolean().optional().describe('Whether the object was uploaded'),
      updated: z.boolean().optional().describe('Whether the object was updated'),
      downloaded: z.boolean().optional().describe('Whether the object was downloaded'),
      moved: z.boolean().optional().describe('Whether the object was moved'),
      copied: z.boolean().optional().describe('Whether the object was copied'),
      deleted: z.boolean().optional().describe('Whether objects were deleted')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = requireProjectRef(ctx.input.projectRef ?? ctx.config.projectRef);

    let mgmt = new ManagementClient(ctx.auth.token);
    let keys = await mgmt.getProjectApiKeys(projectRef);
    let serviceKey = (Array.isArray(keys) ? keys : []).find(
      (k: any) => k.name === 'service_role'
    );
    let apiKey = serviceKey?.api_key;

    if (!apiKey) {
      throw createApiServiceError('Could not retrieve service_role API key for the project');
    }

    let projectClient = new ProjectClient(projectRef, apiKey);
    let { action, bucketId } = ctx.input;

    if (action === 'list') {
      let data = await projectClient.listStorageObjects(bucketId, {
        prefix: ctx.input.prefix,
        search: ctx.input.search,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let objects = (Array.isArray(data) ? data : []).map(mapObject);

      return {
        output: { objects },
        message: `Found **${objects.length}** objects in bucket **${bucketId}**.`
      };
    }

    if (action === 'info') {
      if (!ctx.input.path) throw createApiServiceError('path is required for info action');
      let object = mapObject(
        await projectClient.getStorageObjectInfo(bucketId, ctx.input.path)
      );
      return {
        output: { object },
        message: `Retrieved object info for **${ctx.input.path}** in bucket **${bucketId}**.`
      };
    }

    if (action === 'upload') {
      if (!ctx.input.path) throw createApiServiceError('path is required for upload action');
      let content = getObjectContent(ctx.input);
      let result = await projectClient.uploadStorageObject(bucketId, ctx.input.path, content, {
        contentType: ctx.input.contentType,
        cacheControl: ctx.input.cacheControl,
        upsert: ctx.input.upsert
      });
      return {
        output: { uploaded: true, object: mapObject(result) },
        message: `Uploaded **${ctx.input.path}** to bucket **${bucketId}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.path) throw createApiServiceError('path is required for update action');
      let content = getObjectContent(ctx.input);
      let result = await projectClient.updateStorageObject(bucketId, ctx.input.path, content, {
        contentType: ctx.input.contentType,
        cacheControl: ctx.input.cacheControl
      });
      return {
        output: { updated: true, object: mapObject(result) },
        message: `Updated **${ctx.input.path}** in bucket **${bucketId}**.`
      };
    }

    if (action === 'download') {
      if (!ctx.input.path) throw createApiServiceError('path is required for download action');
      let result = await projectClient.downloadStorageObject(bucketId, ctx.input.path);
      return {
        output: {
          downloaded: true,
          contentType: result.contentType,
          contentLength: result.contentLength,
          attachmentCount: 1
        },
        attachments: [createBase64Attachment(result.content, result.contentType)],
        message: `Downloaded **${ctx.input.path}** from bucket **${bucketId}** (${result.contentLength} bytes, ${result.contentType}).`
      };
    }

    if (action === 'move') {
      if (!ctx.input.sourceKey || !ctx.input.destinationKey) {
        throw createApiServiceError(
          'sourceKey and destinationKey are required for move action'
        );
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
        throw createApiServiceError(
          'sourceKey and destinationKey are required for copy action'
        );
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
        throw createApiServiceError('paths are required for delete action');
      }
      await projectClient.deleteStorageObjects(bucketId, ctx.input.paths);
      return {
        output: { deleted: true },
        message: `Deleted **${ctx.input.paths.length}** objects from bucket **${bucketId}**.`
      };
    }

    if (action === 'get_public_url') {
      if (!ctx.input.path)
        throw createApiServiceError('path is required for get_public_url action');
      let url = await projectClient.getPublicUrl(bucketId, ctx.input.path);
      return {
        output: { url },
        message: `Public URL: ${url}`
      };
    }

    // create_signed_url
    if (!ctx.input.path)
      throw createApiServiceError('path is required for create_signed_url action');
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
