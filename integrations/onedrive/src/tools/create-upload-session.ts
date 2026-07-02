import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createUploadSessionTool = SlateTool.create(spec, {
  name: 'Create Upload Session',
  key: 'create_upload_session',
  description: `Creates a resumable upload session for uploading large files (up to 250 GB) to OneDrive or SharePoint. Returns an upload URL that accepts byte range PUT requests. Use this for files larger than 4 MB.`,
  instructions: [
    'After creating the session, upload file chunks by sending PUT requests to the returned uploadUrl with Content-Range headers.',
    'Upload chunks must be multiples of 320 KiB (327,680 bytes). The last chunk can be any size.'
  ],
  constraints: [
    'The upload URL expires at the returned expirationDateTime.',
    'Upload sessions that receive no activity expire after a short time.'
  ]
})
  .input(
    z.object({
      driveId: z
        .string()
        .optional()
        .describe("ID of the drive. Defaults to the user's personal OneDrive."),
      parentId: z.string().optional().describe('ID of the destination folder'),
      parentPath: z
        .string()
        .optional()
        .describe('Path of the destination folder (e.g. "/Documents")'),
      fileName: z.string().describe('Name for the uploaded file including extension'),
      conflictBehavior: z
        .enum(['rename', 'replace', 'fail'])
        .optional()
        .describe('What to do if a file with the same name exists')
    })
  )
  .output(
    z.object({
      uploadUrl: z
        .string()
        .describe('URL to upload file chunks to via PUT requests with Content-Range headers'),
      expirationDateTime: z
        .string()
        .describe('ISO 8601 timestamp when the upload session expires')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let session = await client.createUploadSession({
      driveId: ctx.input.driveId,
      parentId: ctx.input.parentId,
      parentPath: ctx.input.parentPath,
      fileName: ctx.input.fileName,
      conflictBehavior: ctx.input.conflictBehavior
    });

    return {
      output: session,
      message: `Upload session created for **${ctx.input.fileName}**. Session expires at ${session.expirationDateTime}.`
    };
  })
  .build();
