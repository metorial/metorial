import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

let revisionSchema = z.object({
  revisionId: z.string(),
  mimeType: z.string(),
  modifiedTime: z.string(),
  lastModifyingUser: z
    .object({
      displayName: z.string().optional(),
      emailAddress: z.string().optional(),
      photoLink: z.string().optional()
    })
    .optional(),
  size: z.string().optional(),
  keepForever: z.boolean().optional(),
  publishAuto: z.boolean().optional(),
  published: z.boolean().optional(),
  originalFilename: z.string().optional()
});

export let listRevisionsTool = SlateTool.create(spec, {
  name: 'List Revisions',
  key: 'list_revisions',
  description: `List the revision history of a file. Shows all saved versions with timestamps, who modified them, and file sizes.`,
  instructions: [
    'Some native Google files may return limited revision data depending on account policy.',
    'Pagination: when using `pageToken`, use the same `fileId` as the request that returned the token.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.listRevisions)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file'),
      pageSize: z.number().optional().describe('Maximum number of revisions to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      revisions: z.array(revisionSchema),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let result = await client.listRevisions(ctx.input.fileId, {
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    return {
      output: result,
      message: `Found **${result.revisions.length}** revision(s) for file \`${ctx.input.fileId}\`.`
    };
  })
  .build();
