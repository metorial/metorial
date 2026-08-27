import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { missingRequiredFieldError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let fileSchema = z.object({
  fileId: z.string().describe('File ID'),
  name: z.string().optional().describe('Filename'),
  title: z.string().optional().describe('File title'),
  mimetype: z.string().optional().describe('MIME type'),
  filetype: z.string().optional().describe('File type identifier'),
  size: z.number().optional().describe('File size in bytes'),
  userId: z.string().optional().describe('User ID of the uploader'),
  permalink: z.string().optional().describe('Permalink to the file'),
  urlPrivate: z.string().optional().describe('Private download URL'),
  created: z.number().optional().describe('Unix timestamp when the file was created')
});

export let manageFiles = SlateTool.create(spec, {
  name: 'Manage Files',
  key: 'manage_files',
  description: `Upload, list, get info about, or delete files in Slack. Upload text content as a file snippet, retrieve file metadata, or list files shared in a channel or by a user.`,
  instructions: [
    'To **upload**, provide content and optionally a filename, filetype, title, and channelIds to share to.',
    'Use Slack snippet types such as "text", "python", "javascript", or "markdown"; common aliases like "txt", "py", "js", and "md" are normalized before upload.',
    'To **list**, optionally filter by channelId or userId.',
    'To **get** file info, provide the fileId.',
    'To **delete**, provide the fileId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.files)
  .input(
    z.object({
      action: z.enum(['upload', 'list', 'get', 'delete']).describe('File management action'),
      fileId: z.string().optional().describe('File ID (for get/delete actions)'),
      content: z
        .string()
        .optional()
        .describe('Text content to upload as a file (for upload action)'),
      filename: z.string().optional().describe('Filename for the uploaded file'),
      filetype: z
        .string()
        .optional()
        .describe(
          'Slack snippet type for uploaded text (e.g. "text", "python", "javascript", "markdown"). Common aliases like "txt", "py", "js", and "md" are accepted.'
        ),
      title: z.string().optional().describe('Title for the uploaded file'),
      channelIds: z
        .string()
        .optional()
        .describe(
          'Comma-separated Slack conversation IDs to share the file to, such as C..., G..., or D...; do not pass channel names like #general'
        ),
      initialComment: z.string().optional().describe('Comment to add when sharing the file'),
      threadTs: z
        .string()
        .optional()
        .describe('Thread timestamp to share the file in a thread'),
      filterChannelId: z
        .string()
        .optional()
        .describe('Filter files by channel (for list action)'),
      filterUserId: z.string().optional().describe('Filter files by user (for list action)'),
      count: z.number().optional().describe('Number of files to return (for list action)'),
      page: z.number().optional().describe('Page number (for list action)')
    })
  )
  .output(
    z.object({
      file: fileSchema.optional().describe('File details (for upload/get actions)'),
      files: z.array(fileSchema).optional().describe('List of files (for list action)'),
      deleted: z.boolean().optional().describe('Whether the file was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let { action } = ctx.input;

    let mapFile = (f: any) => ({
      fileId: f.id,
      name: f.name,
      title: f.title,
      mimetype: f.mimetype,
      filetype: f.filetype,
      size: f.size,
      userId: f.user,
      permalink: f.permalink,
      urlPrivate: f.url_private,
      created: f.created || f.timestamp
    });

    if (action === 'upload') {
      if (!ctx.input.content) throw missingRequiredFieldError('content', 'upload action');
      let file = await client.uploadFile({
        content: ctx.input.content,
        filename: ctx.input.filename,
        filetype: ctx.input.filetype,
        title: ctx.input.title,
        channels: ctx.input.channelIds,
        initialComment: ctx.input.initialComment,
        threadTs: ctx.input.threadTs
      });
      return {
        output: { file: mapFile(file) },
        message: `Uploaded file **${file.name || file.title || file.id}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.fileId) throw missingRequiredFieldError('fileId', 'get action');
      let file = await client.getFileInfo(ctx.input.fileId);
      return {
        output: { file: mapFile(file) },
        message: `Retrieved file info for **${file.name || file.title || file.id}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.fileId) throw missingRequiredFieldError('fileId', 'delete action');
      await client.deleteFile(ctx.input.fileId);
      return {
        output: { deleted: true },
        message: `Deleted file \`${ctx.input.fileId}\`.`
      };
    }

    // list
    let result = await client.listFiles({
      channel: ctx.input.filterChannelId,
      user: ctx.input.filterUserId,
      count: ctx.input.count,
      page: ctx.input.page
    });
    return {
      output: { files: result.files.map(mapFile) },
      message: `Listed ${result.files.length} file(s).`
    };
  })
  .build();
