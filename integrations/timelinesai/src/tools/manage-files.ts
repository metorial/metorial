import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, requireArray } from '../lib/client';
import { spec } from '../spec';

let fileSchema = z.object({
  fileUid: z.string().describe('Unique file identifier'),
  filename: z.string().optional().describe('Original filename'),
  size: z.number().optional().describe('File size in bytes'),
  mimetype: z.string().optional().describe('MIME type'),
  uploadedByEmail: z.string().optional().describe('Email of the uploader'),
  uploadedAt: z.string().optional().describe('Upload timestamp'),
  temporaryDownloadUrl: z
    .string()
    .optional()
    .describe('Temporary download URL (valid for 15 minutes)')
});

export let manageFiles = SlateTool.create(spec, {
  name: 'Manage Files',
  key: 'manage_files',
  description: `Upload, list, get details, or delete files in TimelinesAI. Upload a file from a public URL to attach it to messages later. List all uploaded files or filter by filename. Get a file's temporary download URL or delete it.`,
  instructions: [
    'Set the action to "upload", "list", "get", or "delete".',
    'For upload: provide a publicly accessible downloadUrl.',
    'For list: optionally filter by filename or extension.',
    'For get/delete: provide the fileUid.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['upload', 'list', 'get', 'delete']).describe('The operation to perform'),
      downloadUrl: z
        .string()
        .optional()
        .describe('Public URL to download the file from (for upload action)'),
      filename: z
        .string()
        .optional()
        .describe('Filename override for upload, or filter for list'),
      contentType: z.string().optional().describe('MIME type override for upload'),
      fileUid: z.string().optional().describe('File UID (for get or delete actions)')
    })
  )
  .output(
    z.object({
      files: z.array(fileSchema).optional().describe('List of files (for list action)'),
      file: fileSchema.optional().describe('File details (for upload, get actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the file was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, downloadUrl, filename, contentType, fileUid } = ctx.input;

    if (action === 'upload') {
      if (!downloadUrl)
        throw createApiServiceError('downloadUrl is required for upload action');
      let result = await client.uploadFileFromUrl({ downloadUrl, filename, contentType });
      let f = result?.data || result;
      if (typeof f?.uid !== 'string' || f.uid.length === 0) {
        throw createApiServiceError('TimelinesAI did not return the uploaded file UID.');
      }
      if (f.temporary_download_url) {
        let download = await client.getFileDownload(f.uid);
        await ctx.addAttachment({
          type: 'url',
          url: download.url,
          filename: f.filename,
          mimeType: f.mimetype,
          refreshReference: { fileUid: f.uid },
          refreshAt: download.expiresAt
        });
      }
      return {
        output: {
          file: {
            fileUid: f.uid,
            filename: f.filename,
            size: f.size,
            mimetype: f.mimetype,
            uploadedByEmail: f.uploaded_by_email,
            uploadedAt: f.uploaded_at,
            temporaryDownloadUrl: f.temporary_download_url
          }
        },
        message: `File **${f.filename}** uploaded successfully. UID: **${f.uid}**`
      };
    }

    if (action === 'list') {
      let result = await client.listFiles(filename);
      let files = requireArray(result?.data, 'files').map((f: any) => ({
        fileUid: f.uid,
        filename: f.filename,
        size: f.size,
        mimetype: f.mimetype,
        uploadedByEmail: f.uploaded_by_email,
        uploadedAt: f.uploaded_at
      }));
      return {
        output: { files },
        message: `Found **${files.length}** file(s).`
      };
    }

    if (action === 'get') {
      if (!fileUid) throw createApiServiceError('fileUid is required for get action');
      let download = await client.getFileDownload(fileUid);
      let f = download.file;
      await ctx.addAttachment({
        type: 'url',
        url: download.url,
        filename: f.filename,
        mimeType: f.mimetype,
        refreshReference: { fileUid },
        refreshAt: download.expiresAt
      });
      return {
        output: {
          file: {
            fileUid: f.uid,
            filename: f.filename,
            size: f.size,
            mimetype: f.mimetype,
            uploadedByEmail: f.uploaded_by_email,
            uploadedAt: f.uploaded_at,
            temporaryDownloadUrl: f.temporary_download_url
          }
        },
        message: `File **${f.filename}** retrieved. Download URL valid for 15 minutes.`
      };
    }

    if (action === 'delete') {
      if (!fileUid) throw createApiServiceError('fileUid is required for delete action');
      await client.deleteFile(fileUid);
      return {
        output: { deleted: true },
        message: `File **${fileUid}** deleted successfully.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
