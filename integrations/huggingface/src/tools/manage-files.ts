import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient, repoFileDownloadUrl } from '../lib/client';
import { spec } from '../spec';

export let listRepoFilesTool = SlateTool.create(spec, {
  name: 'List Repository Files',
  key: 'list_repo_files',
  description: `List files and directories in a Hugging Face repository at a given path and revision. Returns file metadata including type, size, and OID. Large listings are paginated; pass nextCursor back as cursor to continue.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      path: z.string().optional().describe('Subdirectory path to list (root if omitted)'),
      revision: z
        .string()
        .optional()
        .describe(
          'Git revision (branch, tag, commit SHA, or ref such as "refs/pr/1"; defaults to "main")'
        ),
      recursive: z
        .boolean()
        .optional()
        .describe('List files in all nested directories instead of only the given path'),
      limit: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Maximum entries per page (Hugging Face defaults to 1000)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous nextCursor')
    })
  )
  .output(
    z.object({
      nextCursor: z
        .string()
        .optional()
        .describe('Cursor for the next page; omitted when there are no more entries'),
      files: z
        .array(
          z.object({
            type: z.string().describe('"file" or "directory"'),
            path: z.string().describe('File or directory path'),
            size: z.number().optional().describe('File size in bytes'),
            oid: z.string().optional().describe('Git object ID'),
            lfs: z.any().optional().describe('LFS metadata if stored in LFS')
          })
        )
        .describe('List of files and directories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let page = await client.listRepoFiles({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      path: ctx.input.path,
      revision: ctx.input.revision,
      recursive: ctx.input.recursive,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let entries = Array.isArray(page.data) ? page.data : [];
    let files = entries.map((e: any) => ({
      type: e.type,
      path: e.path,
      size: e.size,
      oid: e.oid,
      lfs: e.lfs
    }));

    return {
      output: { files, nextCursor: page.nextCursor },
      message: `Found **${files.length}** item(s) in **${ctx.input.repoId}**${ctx.input.path ? `/${ctx.input.path}` : ''}${page.nextCursor ? ' (more available)' : ''}.`
    };
  })
  .build();

export let getFileContentTool = SlateTool.create(spec, {
  name: 'Get File Content',
  key: 'get_file_content',
  description: `Download a file from a Hugging Face repository, such as a config file, model card, code, data file, or model weights. Returns the file as a downloadable file together with its MIME type, size, and the commit it was resolved from.`,
  instructions: [
    'Works for private and gated repositories the connected account can access.',
    'The downloadable file is pinned to the resolved commit, so it matches the returned metadata even if the branch moves later.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      filePath: z.string().describe('Path to the file within the repository'),
      revision: z
        .string()
        .optional()
        .describe(
          'Git revision (branch, tag, commit SHA, or ref such as "refs/pr/1"; defaults to "main")'
        )
    })
  )
  .output(
    z.object({
      filePath: z.string().describe('Path of the file'),
      revision: z.string().describe('Requested Git revision'),
      commitSha: z
        .string()
        .optional()
        .describe('Commit SHA the revision resolved to when Hugging Face reports it'),
      mimeType: z.string().optional().describe('MIME type reported by Hugging Face'),
      size: z.number().describe('File size in bytes (0 when Hugging Face does not report it)'),
      downloadUrl: z
        .string()
        .optional()
        .describe('Hugging Face download URL for the file (requires access to the repository)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });
    let revision = ctx.input.revision || 'main';

    // Confirms the file exists and is accessible before offering it for download.
    let file = await client.getFileMetadata({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      filePath: ctx.input.filePath,
      revision
    });
    let mimeType = file.contentType?.split(';')[0]?.trim() || undefined;
    let filename = ctx.input.filePath.split('/').filter(Boolean).pop();

    await ctx.addAttachment({
      type: 'url',
      url: repoFileDownloadUrl(
        ctx.input.repoType,
        ctx.input.repoId,
        file.commitSha || revision,
        ctx.input.filePath
      ),
      mimeType,
      filename,
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });

    return {
      output: {
        filePath: ctx.input.filePath,
        revision,
        commitSha: file.commitSha,
        mimeType,
        size: file.size ?? 0,
        downloadUrl: file.downloadUrl
      },
      message: `Prepared **${ctx.input.filePath}** from **${ctx.input.repoId}**${
        file.commitSha ? ` at commit \`${file.commitSha.slice(0, 12)}\`` : ''
      } for download${file.size !== undefined ? ` (${file.size} bytes)` : ''}.`
    };
  })
  .build();

export let uploadFileTool = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload or update a text file in a Hugging Face repository. Creates a commit with the file content.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      filePath: z.string().describe('Destination path within the repository'),
      content: z.string().describe('Text content to upload'),
      commitMessage: z.string().optional().describe('Commit message for the upload'),
      revision: z
        .string()
        .optional()
        .describe('Target branch or ref such as "refs/pr/1" (defaults to "main")'),
      createPullRequest: z
        .boolean()
        .optional()
        .describe(
          'Open a pull request with this commit instead of committing directly to the revision'
        )
    })
  )
  .output(
    z.object({
      commitSha: z.string().optional().describe('SHA of the created commit'),
      commitUrl: z.string().optional().describe('URL to the commit'),
      pullRequestUrl: z
        .string()
        .optional()
        .describe('URL of the pull request when createPullRequest is true')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let result = await client.uploadFile({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      filePath: ctx.input.filePath,
      content: ctx.input.content,
      commitMessage: ctx.input.commitMessage,
      revision: ctx.input.revision,
      createPullRequest: ctx.input.createPullRequest
    });

    return {
      output: {
        commitSha: result.commitOid || result.sha,
        commitUrl: result.commitUrl,
        pullRequestUrl: result.pullRequestUrl
      },
      message: result.pullRequestUrl
        ? `Opened a pull request uploading **${ctx.input.filePath}** to **${ctx.input.repoId}**.`
        : `Uploaded **${ctx.input.filePath}** to **${ctx.input.repoId}**.`
    };
  })
  .build();

export let deleteFileTool = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete a file from a Hugging Face repository. Creates a commit that removes the specified file.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      repoType: z.enum(['model', 'dataset', 'space']).describe('Type of repository'),
      repoId: z.string().describe('Full repository ID (e.g. "username/repo-name")'),
      filePath: z.string().describe('Path of the file to delete'),
      commitMessage: z.string().optional().describe('Commit message for the deletion'),
      revision: z
        .string()
        .optional()
        .describe('Target branch or ref such as "refs/pr/1" (defaults to "main")'),
      createPullRequest: z
        .boolean()
        .optional()
        .describe(
          'Open a pull request with this commit instead of committing directly to the revision'
        )
    })
  )
  .output(
    z.object({
      commitSha: z.string().optional().describe('SHA of the created commit'),
      commitUrl: z.string().optional().describe('URL to the commit'),
      pullRequestUrl: z
        .string()
        .optional()
        .describe('URL of the pull request when createPullRequest is true'),
      deleted: z.boolean().describe('Whether the file was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let result = await client.deleteFile({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      filePath: ctx.input.filePath,
      commitMessage: ctx.input.commitMessage,
      revision: ctx.input.revision,
      createPullRequest: ctx.input.createPullRequest
    });

    return {
      output: {
        commitSha: result.commitOid || result.sha,
        commitUrl: result.commitUrl,
        pullRequestUrl: result.pullRequestUrl,
        deleted: !result.pullRequestUrl
      },
      message: result.pullRequestUrl
        ? `Opened a pull request deleting **${ctx.input.filePath}** from **${ctx.input.repoId}**.`
        : `Deleted **${ctx.input.filePath}** from **${ctx.input.repoId}**.`
    };
  })
  .build();
