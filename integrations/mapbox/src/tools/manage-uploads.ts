import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

let uploadSchema = z.object({
  uploadId: z.string().optional().describe('Upload ID'),
  tilesetId: z.string().optional().describe('Target tileset ID'),
  name: z.string().optional().describe('Upload name'),
  complete: z.boolean().optional().describe('Whether the upload processing is complete'),
  error: z.string().nullable().optional().describe('Error message if upload failed'),
  progress: z.number().optional().describe('Upload progress (0-1)'),
  created: z.string().optional().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp'),
  owner: z.string().optional().describe('Owner username')
});

export let manageUploadsTool = SlateTool.create(spec, {
  name: 'Manage Uploads',
  key: 'manage_uploads',
  description: `List, create, check status, or delete data uploads. Uploads transform geographic data into tilesets for use with Mapbox maps. Supports uploading from a staged URL to create or replace tilesets.`,
  instructions: [
    'Use action "list" to view recent uploads and their status.',
    'Use action "get" to check the status of a specific upload.',
    'Use action "credentials" to get temporary S3 credentials for staging data before upload.',
    'Use action "create" to start an upload from a staged URL — provide the tileset ID and staged URL.',
    'Typical workflow: get credentials → stage file to S3 → create upload with staged URL.'
  ],
  constraints: [
    'Rate limit: 60 requests per minute.',
    'Requires uploads:read and uploads:write token scopes.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'credentials', 'delete'])
        .describe('Operation to perform'),
      uploadId: z.string().optional().describe('Upload ID (required for get, delete)'),
      tilesetId: z
        .string()
        .optional()
        .describe('Target tileset ID in "username.tilesetname" format (for create)'),
      url: z
        .string()
        .optional()
        .describe('Staged data URL (for create; typically an S3 URL from credentials)'),
      name: z.string().optional().describe('Upload name (for create)'),
      limit: z.number().optional().describe('Max results to return (for list)'),
      reverse: z.boolean().optional().describe('Reverse sort order (for list)')
    })
  )
  .output(
    z.object({
      upload: uploadSchema.optional().describe('Upload details (for get/create)'),
      uploads: z.array(uploadSchema).optional().describe('List of uploads (for list)'),
      credentials: z
        .object({
          bucket: z.string().optional(),
          key: z.string().optional(),
          accessKeyId: z.string().optional(),
          secretAccessKey: z.string().optional(),
          sessionToken: z.string().optional(),
          url: z.string().optional().describe('Staged URL to use when creating the upload')
        })
        .optional()
        .describe('S3 staging credentials (for credentials)'),
      deleted: z.boolean().optional().describe('Whether the upload was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let { action } = ctx.input;

    let mapUpload = (u: any) => ({
      uploadId: u.id,
      tilesetId: u.tileset,
      name: u.name,
      complete: u.complete,
      error: u.error,
      progress: u.progress,
      created: u.created,
      modified: u.modified,
      owner: u.owner
    });

    if (action === 'list') {
      let uploads = await client.listUploads({
        limit: ctx.input.limit,
        reverse: ctx.input.reverse
      });
      let mapped = (uploads || []).map(mapUpload);
      return {
        output: { uploads: mapped },
        message: `Found **${mapped.length}** upload${mapped.length !== 1 ? 's' : ''}.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.uploadId) throw new Error('uploadId is required for get');
      let u = await client.getUpload(ctx.input.uploadId);
      return {
        output: { upload: mapUpload(u) },
        message: `Upload **${ctx.input.uploadId}**: ${u.complete ? 'complete' : `in progress (${Math.round((u.progress || 0) * 100)}%)`}${u.error ? ` — error: ${u.error}` : ''}.`
      };
    }

    if (action === 'credentials') {
      let creds = await client.getUploadCredentials();
      return {
        output: {
          credentials: {
            bucket: creds.bucket,
            key: creds.key,
            accessKeyId: creds.accessKeyId,
            secretAccessKey: creds.secretAccessKey,
            sessionToken: creds.sessionToken,
            url: creds.url
          }
        },
        message: `Generated S3 staging credentials. Use the provided URL when creating the upload.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.tilesetId) throw new Error('tilesetId is required for create');
      if (!ctx.input.url) throw new Error('url is required for create');
      let u = await client.createUpload({
        tileset: ctx.input.tilesetId,
        url: ctx.input.url,
        name: ctx.input.name
      });
      return {
        output: { upload: mapUpload(u) },
        message: `Created upload for tileset **${ctx.input.tilesetId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.uploadId) throw new Error('uploadId is required for delete');
      await client.deleteUpload(ctx.input.uploadId);
      return {
        output: { deleted: true },
        message: `Deleted upload **${ctx.input.uploadId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
