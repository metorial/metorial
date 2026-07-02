import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    // Try as a file first
    let fileResult = await client.getFileContent(
      ctx.input.repositoryName,
      ctx.input.filePath,
      ctx.input.revision
    );

    let blob = fileResult?.repository?.commit?.blob;
    if (blob) {
      return {
        output: {
          path: blob.path,
          content: blob.binary ? undefined : blob.content,
          isBinary: blob.binary,
          byteSize: blob.byteSize
        },
        message: blob.binary
          ? `Binary file at **${blob.path}** (${blob.byteSize} bytes).`
          : `Read **${blob.path}** (${blob.byteSize} bytes).`
      };
    }

    // If no file found, try as directory
    let dirResult = await client.listDirectoryContents(
      ctx.input.repositoryName,
      ctx.input.filePath,
      ctx.input.revision
    );

    let tree = dirResult?.repository?.commit?.tree;
    if (tree) {
      let entries = (tree.entries || []).map((e: any) => ({
        name: e.name,
        path: e.path,
        isDirectory: e.isDirectory
      }));

      return {
        output: {
          path: ctx.input.filePath,
          entries
        },
        message: `Listed **${entries.length}** entries in **${ctx.input.filePath}**.`
      };
    }

    throw new Error(`Path not found: ${ctx.input.filePath} in ${ctx.input.repositoryName}`);
  })
  .build();
