import { getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import {
  filePath,
  MAX_BYTES,
  nativeCount,
  nativeId,
  protect,
  reject,
  text
} from '../lib/contracts';
import { spec } from '../spec';

const fileSchema = z.object({
  path: z.string(),
  fileName: z.string(),
  size: z.number(),
  mimeType: z.string().optional()
});
export const downloadFile = SlateTool.create(spec, {
  key: 'download_file',
  name: 'Download File',
  description:
    'Download a Files.com file of up to 10 MiB. Requires file read access; downloading can create provider audit history.',
  tags: { readOnly: true }
})
  .input(z.object({ path: z.string().describe('Exact file path from list_folder.') }))
  .output(fileSchema)
  .handleInvocation(async ctx => {
    const { file, bytes } = await createClient(ctx.auth, ctx.config).downloadFile(
      ctx.input.path
    );
    protect(bytes.toString('utf8'), ctx.auth.token);
    await ctx.addAttachment({
      type: 'content',
      content: bytes,
      filename: text(file.display_name),
      mimeType:
        typeof file.mime_type === 'string' ? file.mime_type : 'application/octet-stream'
    });
    return {
      output: {
        path: text(file.path),
        fileName: text(file.display_name),
        size: bytes.byteLength,
        mimeType: typeof file.mime_type === 'string' ? file.mime_type : undefined
      },
      message: 'Downloaded the authorized file.'
    };
  })
  .build();
export const uploadFile = SlateTool.create(spec, {
  key: 'upload_file',
  name: 'Upload File',
  description:
    'Upload up to 10 MiB of UTF-8 text or Base64 bytes. Uploading may replace an existing file and retain audit history. A partial upload or lost final receipt requires exact-resource inspection before retrying.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      path: z.string().describe('Full destination filename.'),
      content: z.string().describe('UTF-8 text or canonical Base64 bytes.'),
      encoding: z.enum(['utf-8', 'base64']).default('utf-8'),
      mkdirParents: z
        .boolean()
        .default(false)
        .describe('Whether to create missing parent folders.')
    })
  )
  .output(fileSchema)
  .handleInvocation(async ctx => {
    filePath(ctx.input.path);
    if (ctx.input.content.length > (MAX_BYTES * 4) / 3 + 4)
      reject('Upload content exceeds 10 MiB.');
    if (
      ctx.input.encoding === 'base64' &&
      (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        ctx.input.content
      ) ||
        getBase64ByteLength(ctx.input.content) > MAX_BYTES)
    )
      reject('Provide canonical Base64 content of at most 10 MiB.');
    const bytes = Buffer.from(
      ctx.input.content,
      ctx.input.encoding === 'base64' ? 'base64' : 'utf8'
    );
    if (bytes.byteLength > MAX_BYTES) reject('Uploads are limited to 10 MiB.');
    protect(bytes.toString('utf8'), ctx.auth.token);
    const file = await createClient(ctx.auth, ctx.config).uploadFile(
      ctx.input.path,
      bytes,
      ctx.input.mkdirParents
    );
    return {
      output: {
        path: text(file.path),
        fileName: text(file.display_name),
        size: bytes.byteLength,
        mimeType: typeof file.mime_type === 'string' ? file.mime_type : undefined
      },
      message:
        'Uploaded the file and verified its current metadata. Existing versions or audit history may remain.'
    };
  })
  .build();
export const getFileOperation = SlateTool.create(spec, {
  key: 'get_file_operation',
  name: 'Get File Operation',
  description:
    'Read the native status of a file migration started by copy or move. Pending status does not mean completion; visibility depends on the API key and workspace.',
  tags: { readOnly: true }
})
  .input(
    z.object({ fileMigrationId: z.number().describe('Migration ID returned by manage_file.') })
  )
  .output(
    z.object({
      fileMigrationId: z.number(),
      status: z.string(),
      operation: z.string().optional(),
      sourcePath: z.string().optional(),
      destinationPath: z.string().optional(),
      filesMoved: z.number().optional(),
      filesTotal: z.number().optional(),
      failureMessage: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const r = await createClient(ctx.auth, ctx.config).getFileOperation(
      ctx.input.fileMigrationId
    );
    return {
      output: {
        fileMigrationId: nativeId(r.id),
        status: text(r.status),
        operation: typeof r.operation === 'string' ? r.operation : undefined,
        sourcePath: typeof r.path === 'string' ? r.path : undefined,
        destinationPath: typeof r.dest_path === 'string' ? r.dest_path : undefined,
        filesMoved: nativeCount(r.files_moved),
        filesTotal: nativeCount(r.files_total),
        failureMessage: typeof r.failure_message === 'string' ? r.failure_message : undefined
      },
      message: 'Retrieved the native migration status.'
    };
  })
  .build();
export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Connected Identity',
  description:
    'Read the current API key identity, owning-user ID when present and native site/workspace context. A site-wide key has no owning user; this does not infer a signed-in human.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      apiKeyId: z.number(),
      name: z.string().optional(),
      userId: z.number().optional(),
      siteId: z.number().optional(),
      siteName: z.string().optional(),
      workspaceId: z.number().optional(),
      permissionSet: z.string().optional(),
      serviceOrigin: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx.auth, ctx.config),
      r = await client.getCurrentApiKey();
    return {
      output: {
        apiKeyId: nativeId(r.id),
        name: typeof r.name === 'string' ? r.name : undefined,
        userId:
          typeof r.user_id === 'number' && r.user_id > 0 ? nativeId(r.user_id) : undefined,
        siteId:
          r.site_id === undefined || r.site_id === null ? undefined : nativeId(r.site_id),
        siteName: typeof r.site_name === 'string' ? r.site_name : undefined,
        workspaceId: nativeCount(r.workspace_id),
        permissionSet: typeof r.permission_set === 'string' ? r.permission_set : undefined,
        serviceOrigin: client.baseUrl
      },
      message: 'Retrieved the current API key and its observed account context.'
    };
  })
  .build();
