import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let browseRepository = SlateTool.create(spec, {
  name: 'Browse Repository',
  key: 'browse_repository',
  description: `Browse a project's repository tree, read file contents, or compare branches. Use "tree" to list directory contents, "file" to read a specific file, or "compare" to view the diff between two refs (branches, tags, or SHAs).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID or URL-encoded path'),
      action: z
        .enum(['tree', 'file', 'compare'])
        .describe(
          'Action: "tree" to list files, "file" to read content, "compare" to diff two refs'
        ),
      path: z.string().optional().describe('File or directory path (for tree/file actions)'),
      ref: z
        .string()
        .optional()
        .describe('Branch, tag, or commit SHA to browse (defaults to default branch)'),
      recursive: z.boolean().optional().describe('List files recursively (tree action)'),
      from: z.string().optional().describe('Base ref for comparison (compare action)'),
      to: z.string().optional().describe('Head ref for comparison (compare action)'),
      perPage: z.number().optional().describe('Results per page for tree listing'),
      page: z.number().optional().describe('Page number for tree listing')
    })
  )
  .output(
    z.object({
      tree: z
        .array(
          z.object({
            entryId: z.string().describe('Git object SHA'),
            name: z.string().describe('File or directory name'),
            type: z.string().describe('"blob" for files, "tree" for directories'),
            path: z.string().describe('Full path'),
            mode: z.string().describe('File mode')
          })
        )
        .optional()
        .describe('Directory listing (tree action)'),
      file: z
        .object({
          fileName: z.string().describe('File name'),
          filePath: z.string().describe('File path'),
          size: z.number().describe('File size in bytes'),
          encoding: z.string().describe('Content encoding'),
          content: z.string().describe('File content (base64 or raw)'),
          ref: z.string().describe('Branch/tag/SHA the file was read from'),
          lastCommitId: z.string().describe('Last commit that modified this file')
        })
        .optional()
        .describe('File content (file action)'),
      comparison: z
        .object({
          commitFrom: z.string().describe('Base commit SHA'),
          commitTo: z.string().describe('Head commit SHA'),
          commitsCount: z.number().describe('Number of commits between refs'),
          diffsCount: z.number().describe('Number of changed files'),
          diffs: z
            .array(
              z.object({
                oldPath: z.string().describe('Original file path'),
                newPath: z.string().describe('New file path'),
                newFile: z.boolean().describe('Whether this is a new file'),
                renamedFile: z.boolean().describe('Whether the file was renamed'),
                deletedFile: z.boolean().describe('Whether the file was deleted'),
                diff: z.string().describe('Unified diff content')
              })
            )
            .describe('File diffs')
        })
        .optional()
        .describe('Branch comparison (compare action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    switch (ctx.input.action) {
      case 'tree': {
        let items = await client.getRepositoryTree(ctx.input.projectId, {
          path: ctx.input.path,
          ref: ctx.input.ref,
          recursive: ctx.input.recursive,
          perPage: ctx.input.perPage,
          page: ctx.input.page
        });

        let tree = items.map((item: any) => ({
          entryId: item.id,
          name: item.name,
          type: item.type,
          path: item.path,
          mode: item.mode
        }));

        return {
          output: { tree },
          message: `Listed **${tree.length}** entries in \`${ctx.input.path || '/'}\`${ctx.input.ref ? ` on \`${ctx.input.ref}\`` : ''}`
        };
      }

      case 'file': {
        if (!ctx.input.path) throw gitLabServiceError('File path is required');
        let file = await client.getFileContent(
          ctx.input.projectId,
          ctx.input.path,
          ctx.input.ref
        );

        return {
          output: {
            file: {
              fileName: file.file_name,
              filePath: file.file_path,
              size: file.size,
              encoding: file.encoding,
              content: file.content,
              ref: file.ref,
              lastCommitId: file.last_commit_id
            }
          },
          message: `Read file \`${file.file_path}\` (${file.size} bytes) from \`${file.ref}\``
        };
      }

      case 'compare': {
        if (!ctx.input.from || !ctx.input.to)
          throw gitLabServiceError('Both "from" and "to" refs are required for compare');
        let comparison = await client.compareBranches(
          ctx.input.projectId,
          ctx.input.from,
          ctx.input.to
        );

        let diffs = (comparison.diffs || []).map((d: any) => ({
          oldPath: d.old_path,
          newPath: d.new_path,
          newFile: d.new_file,
          renamedFile: d.renamed_file,
          deletedFile: d.deleted_file,
          diff: d.diff
        }));

        return {
          output: {
            comparison: {
              commitFrom: comparison.commit?.id || ctx.input.from,
              commitTo: comparison.commit?.id || ctx.input.to,
              commitsCount: (comparison.commits || []).length,
              diffsCount: diffs.length,
              diffs
            }
          },
          message: `Compared \`${ctx.input.from}\` → \`${ctx.input.to}\`: **${diffs.length}** changed files across **${(comparison.commits || []).length}** commits`
        };
      }
    }
  })
  .build();
