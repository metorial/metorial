import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fail } from '../lib/validation';
import { spec } from '../spec';

export let getFileContent = SlateTool.create(spec, {
  name: 'Get File Content',
  key: 'get_file_content',
  description: `Read the content of a file or list directory entries from a repository on Sourcegraph.
Provide the full repository name (e.g., \`github.com/owner/repo\`) and file path.
Optionally specify a revision (branch, tag, or commit SHA).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryName: z
        .string()
        .describe('Full repository name (e.g., github.com/owner/repo)'),
      filePath: z.string().describe('Path to the file or directory within the repository'),
      revision: z
        .string()
        .optional()
        .describe('Branch name, tag, or commit SHA. Defaults to HEAD.')
    })
  )
  .output(
    z.object({
      path: z.string().describe('Path of the file or directory'),
      content: z.string().optional().describe('File content (for files)'),
      isBinary: z.boolean().optional().describe('Whether the file is binary'),
      revisionOid: z
        .string()
        .optional()
        .describe('Resolved immutable Git revision used for this read.'),
      entriesTruncated: z.boolean().optional(),
      byteSize: z.number().optional().describe('File size in bytes'),
      entries: z
        .array(
          z.object({
            name: z.string(),
            path: z.string(),
            isDirectory: z.boolean()
          })
        )
        .optional()
        .describe('Directory entries (for directories)')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.forContext(ctx);

    let fileResult =
      ctx.input.filePath === '' || ctx.input.filePath === '/'
        ? undefined
        : await client.getFileContent(
            ctx.input.repositoryName,
            ctx.input.filePath,
            ctx.input.revision
          );

    let blob = fileResult?.repository?.commit?.blob;
    if (blob) {
      if (
        fileResult?.repository?.name !== ctx.input.repositoryName ||
        blob.path !== ctx.input.filePath ||
        blob.byteSize > 1024 * 1024 ||
        (!blob.binary && Buffer.byteLength(blob.content, 'utf8') > 1024 * 1024)
      )
        throw fail(
          'File locator or size was not confirmed. Choose a matching file of at most 1 MiB.',
          'invalid_upstream_response'
        );
      return {
        output: {
          path: blob.path,
          revisionOid: fileResult?.repository?.commit?.oid,
          content: blob.binary ? undefined : blob.content,
          isBinary: blob.binary,
          byteSize: blob.byteSize
        },
        message: blob.binary
          ? `Binary file at **${blob.path}** (${blob.byteSize} bytes).`
          : `Read **${blob.path}** (${blob.byteSize} bytes).`
      };
    }

    let dirResult = await client.listDirectoryContents(
      ctx.input.repositoryName,
      ctx.input.filePath === '/' ? '' : ctx.input.filePath,
      fileResult?.repository?.commit?.oid ?? ctx.input.revision
    );

    let tree = dirResult?.repository?.commit?.tree;
    if (tree) {
      if (
        dirResult.repository?.name !== ctx.input.repositoryName ||
        tree.path !== (ctx.input.filePath === '/' ? '' : ctx.input.filePath)
      )
        throw fail('Directory locator was not confirmed.', 'invalid_upstream_response');
      let entries = tree.entries.slice(0, 1000).map(e => ({
        name: e.name,
        path: e.path,
        isDirectory: e.isDirectory
      }));

      return {
        output: {
          path: ctx.input.filePath,
          revisionOid: dirResult.repository?.commit?.oid,
          entriesTruncated: tree.entries.length > 1000,
          entries
        },
        message: `Listed **${entries.length}** entries in **${ctx.input.filePath}**.`
      };
    }

    throw fail(`Path not found: ${ctx.input.filePath} in ${ctx.input.repositoryName}`);
  })
  .build();
