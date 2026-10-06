import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid } from '../lib/validation';
import { spec } from '../spec';

export let copyMoveFile = SlateTool.create(spec, {
  name: 'Copy, Move, or Rename File',
  key: 'copy_move_file',
  description: `Copy, move, or rename a file in the ImageKit Media Library. Use the **operation** field to choose the action. Copy and move use source file path and destination folder. Rename changes the file name and can optionally purge CDN cache.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z.enum(['copy', 'move', 'rename']).describe('The operation to perform'),
      sourceFilePath: z
        .string()
        .describe('Full path of the source file, e.g. "/images/photo.jpg"'),
      destinationPath: z
        .string()
        .optional()
        .describe('Destination folder path for copy/move operations, e.g. "/archive/"'),
      newFileName: z
        .string()
        .optional()
        .describe('New file name for rename operation, e.g. "new-name.jpg"'),
      includeFileVersions: z
        .boolean()
        .optional()
        .describe('Include file versions when copying (copy only)'),
      purgeCache: z
        .boolean()
        .optional()
        .describe('Purge CDN cache of the old URL after renaming (rename only)')
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe('Whether the file operation succeeded; cache purge can fail separately'),
      cachePurgeFailed: z
        .boolean()
        .optional()
        .describe('Whether rename succeeded but its requested cache purge failed'),
      purgeRequestId: z
        .string()
        .optional()
        .describe('Cache purge request ID (only when rename with purgeCache=true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let purgeRequestId: string | undefined;
    let cachePurgeFailed: boolean | undefined;
    if (
      ctx.input.operation !== 'rename' &&
      (ctx.input.newFileName !== undefined || ctx.input.purgeCache !== undefined)
    )
      throw invalid('newFileName and purgeCache apply only to rename.');
    if (ctx.input.operation !== 'copy' && ctx.input.includeFileVersions !== undefined)
      throw invalid('includeFileVersions applies only to copy.');
    if (ctx.input.operation === 'rename' && ctx.input.destinationPath !== undefined)
      throw invalid('destinationPath applies only to copy and move.');

    if (ctx.input.operation === 'copy') {
      if (!ctx.input.destinationPath)
        throw invalid('destinationPath is required for copy operation');
      await client.copyFile(
        ctx.input.sourceFilePath,
        ctx.input.destinationPath,
        ctx.input.includeFileVersions
      );
    } else if (ctx.input.operation === 'move') {
      if (!ctx.input.destinationPath)
        throw invalid('destinationPath is required for move operation');
      await client.moveFile(ctx.input.sourceFilePath, ctx.input.destinationPath);
    } else if (ctx.input.operation === 'rename') {
      if (!ctx.input.newFileName)
        throw invalid('newFileName is required for rename operation');
      let result = await client.renameFile(
        ctx.input.sourceFilePath,
        ctx.input.newFileName,
        ctx.input.purgeCache
      );
      purgeRequestId = result.purgeRequestId;
      cachePurgeFailed = result.cachePurgeFailed;
    }

    let opLabel =
      ctx.input.operation === 'copy'
        ? 'Copied'
        : ctx.input.operation === 'move'
          ? 'Moved'
          : 'Renamed';

    return {
      output: {
        success: true,
        purgeRequestId,
        cachePurgeFailed
      },
      message: `${opLabel} request accepted by ImageKit. Destination names may be normalized; inspect file details to confirm the resulting path.${cachePurgeFailed ? ' The cache purge failed; inspect cached copies before retrying the purge.' : ''}`
    };
  })
  .build();
