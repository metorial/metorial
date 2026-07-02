import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireZohoCrmString, zohoCrmServiceError } from '../lib/errors';
import { spec } from '../spec';

let defaultAttachmentFields = [
  'id',
  'Owner',
  'File_Name',
  'Size',
  'Created_Time',
  'Modified_Time',
  'Parent_Id'
];

let resultSchema = z.object({
  attachmentId: z.string().optional().describe('Attachment ID.'),
  status: z.string().optional().describe('Status of the operation.'),
  message: z.string().optional().describe('Zoho CRM response message.'),
  code: z.string().optional().describe('Zoho CRM response code.')
});

let mapMutationResults = (result: any) =>
  (result?.data || []).map((item: any) => ({
    attachmentId: item?.details?.id,
    status: item?.status,
    message: item?.message,
    code: item?.code
  }));

export let manageAttachments = SlateTool.create(spec, {
  name: 'Manage Attachments',
  key: 'manage_attachments',
  description: `List, upload, download, or delete attachments on a Zoho CRM record. Downloaded file bytes are returned through Slate attachments, not inline output fields.`,
  instructions: [
    'Use action "list" to inspect attachment IDs for a record.',
    'Use action "upload_file" with fileContentBase64 and fileName, or action "upload_link" with attachmentUrl.',
    'Use action "download" only for file attachments; Zoho CRM does not allow downloading link attachments.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'upload_file', 'upload_link', 'download', 'delete'])
        .describe('Attachment action to perform.'),
      module: z
        .string()
        .describe('API name of the parent CRM module, e.g. "Leads", "Contacts", "Deals".'),
      recordId: z.string().describe('ID of the parent CRM record.'),
      attachmentId: z
        .string()
        .optional()
        .describe('Attachment ID. Required for "download" and "delete".'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Attachment field API names to return for "list".'),
      page: z.number().optional().describe('Page number for listing attachments.'),
      perPage: z.number().optional().describe('Attachments per page. Maximum: 200.'),
      attachmentUrl: z
        .string()
        .optional()
        .describe('URL to attach as a link. Required for "upload_link".'),
      title: z.string().optional().describe('Optional title for an uploaded link attachment.'),
      fileName: z.string().optional().describe('File name for "upload_file".'),
      fileContentBase64: z
        .string()
        .optional()
        .describe('Base64-encoded file content for "upload_file".'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type for uploaded or downloaded file content.')
    })
  )
  .output(
    z.object({
      attachments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Attachment metadata for "list".'),
      moreRecords: z.boolean().optional().describe('Whether more attachments are available.'),
      results: z.array(resultSchema).optional().describe('Mutation results.'),
      attachmentId: z
        .string()
        .optional()
        .describe('Attachment ID for download/delete actions.'),
      fileName: z.string().optional().describe('Downloaded file name, when available.'),
      mimeType: z.string().optional().describe('MIME type of the returned Slate attachment.'),
      size: z.number().optional().describe('Downloaded attachment size in bytes.'),
      attachmentCount: z.number().optional().describe('Number of Slate attachments returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    if (ctx.input.action === 'list') {
      let result = await client.getAttachments(
        ctx.input.module,
        ctx.input.recordId,
        ctx.input.fields?.length ? ctx.input.fields : defaultAttachmentFields,
        ctx.input.page,
        ctx.input.perPage
      );
      let attachments = result?.data || [];

      return {
        output: {
          attachments,
          moreRecords: result?.info?.more_records ?? false
        },
        message: `Retrieved **${attachments.length}** attachment(s) for record **${ctx.input.recordId}**.`
      };
    }

    if (ctx.input.action === 'upload_file') {
      let fileContentBase64 = requireZohoCrmString(
        ctx.input.fileContentBase64,
        'fileContentBase64',
        'upload_file'
      );
      let fileName = requireZohoCrmString(ctx.input.fileName, 'fileName', 'upload_file');
      let result = await client.uploadAttachment({
        module: ctx.input.module,
        recordId: ctx.input.recordId,
        fileName,
        fileContentBase64,
        mimeType: ctx.input.mimeType
      });
      let results = mapMutationResults(result);

      return {
        output: { results },
        message: `Uploaded **${results.filter((item: any) => item.status === 'success').length}** file attachment(s) to record **${ctx.input.recordId}**.`
      };
    }

    if (ctx.input.action === 'upload_link') {
      let attachmentUrl = requireZohoCrmString(
        ctx.input.attachmentUrl,
        'attachmentUrl',
        'upload_link'
      );
      let result = await client.uploadAttachment({
        module: ctx.input.module,
        recordId: ctx.input.recordId,
        attachmentUrl,
        title: ctx.input.title
      });
      let results = mapMutationResults(result);

      return {
        output: { results },
        message: `Uploaded **${results.filter((item: any) => item.status === 'success').length}** link attachment(s) to record **${ctx.input.recordId}**.`
      };
    }

    if (ctx.input.action === 'download') {
      let attachmentId = requireZohoCrmString(
        ctx.input.attachmentId,
        'attachmentId',
        'download'
      );
      let result = await client.downloadAttachment(
        ctx.input.module,
        ctx.input.recordId,
        attachmentId
      );
      let mimeType = ctx.input.mimeType ?? result.contentType;

      return {
        output: {
          attachmentId,
          fileName: result.fileName,
          mimeType,
          size: result.size,
          attachmentCount: 1
        },
        attachments: [createBase64Attachment(result.contentBase64, mimeType)],
        message: `Downloaded attachment **${attachmentId}** as a Slate attachment.`
      };
    }

    if (ctx.input.action === 'delete') {
      let attachmentId = requireZohoCrmString(
        ctx.input.attachmentId,
        'attachmentId',
        'delete'
      );
      let result = await client.deleteAttachment(
        ctx.input.module,
        ctx.input.recordId,
        attachmentId
      );
      let results = mapMutationResults(result);

      return {
        output: { attachmentId, results },
        message: `Deleted attachment **${attachmentId}** from record **${ctx.input.recordId}**.`
      };
    }

    throw zohoCrmServiceError(`Unsupported attachment action: ${ctx.input.action}`);
  })
  .build();
