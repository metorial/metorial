import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient } from '../lib/client';
import { spec } from '../spec';

export let listRepoFilesTool = SlateTool.create(spec, {
  name: 'List Repository Files',
  key: 'list_repo_files',
  description: `List files and directories in a Hugging Face repository at a given path and revision. Returns file metadata including type, size, and OID.`,
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
        .describe('Git revision (branch, tag, or commit SHA; defaults to "main")')
    })
  )
  .output(
    z.object({
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

    let entries = await client.listRepoFiles({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      path: ctx.input.path,
      revision: ctx.input.revision
    });

    let files = entries.map((e: any) => ({
      type: e.type,
      path: e.path,
      size: e.size,
      oid: e.oid,
      lfs: e.lfs
    }));

    return {
      output: { files },
      message: `Found **${files.length}** item(s) in **${ctx.input.repoId}**${ctx.input.path ? `/${ctx.input.path}` : ''}.`
    };
  })
  .build();

export let getFileContentTool = SlateTool.create(spec, {
  name: 'Get File Content',
  key: 'get_file_content',
  description: `Read the text content of a file in a Hugging Face repository. Best suited for text files such as config files, model cards, and code.`,
  instructions: ['Only use for text files; binary files will not be readable.'],
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
        .describe('Git revision (branch, tag, or commit SHA; defaults to "main")')
    })
  )
  .output(
    z.object({
      filePath: z.string().describe('Path of the file read'),
      mimeType: z.string().optional().describe('MIME type reported by Hugging Face'),
      size: z.number().describe('Downloaded content size in bytes'),
      attachmentCount: z.number().describe('Number of returned Slate attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let result = await client.getFileContent({
      repoType: ctx.input.repoType,
      repoId: ctx.input.repoId,
      filePath: ctx.input.filePath,
      revision: ctx.input.revision
    });

    return {
      output: {
        filePath: ctx.input.filePath,
        mimeType: result.contentType,
        size: result.size,
        attachmentCount: 1
      },
      attachments: [createTextAttachment(result.content, result.contentType || 'text/plain')],
      message: `Retrieved content of **${ctx.input.filePath}** from **${ctx.input.repoId}**.`
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
      revision: z.string().optional().describe('Target branch (defaults to "main")')
    })
  )
  .output(
    z.object({
      commitSha: z.string().optional().describe('SHA of the created commit'),
      commitUrl: z.string().optional().describe('URL to the commit')
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
      revision: ctx.input.revision
    });

    return {
      output: {
        commitSha: result.commitOid || result.sha,
        commitUrl: result.commitUrl
      },
      message: `Uploaded **${ctx.input.filePath}** to **${ctx.input.repoId}**.`
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
      revision: z.string().optional().describe('Target branch (defaults to "main")')
    })
  )
  .output(
    z.object({
      commitSha: z.string().optional().describe('SHA of the created commit'),
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
      revision: ctx.input.revision
    });

    return {
      output: {
        commitSha: result.commitOid || result.sha,
        deleted: true
      },
      message: `Deleted **${ctx.input.filePath}** from **${ctx.input.repoId}**.`
    };
  })
  .build();
