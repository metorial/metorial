import { createApiServiceError, createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

let secretFileSummarySchema = z.object({
  name: z.string().describe('Secret file name')
});

export let manageSecretFiles = SlateTool.create(spec, {
  name: 'Manage Secret Files',
  key: 'manage_secret_files',
  description: `Manage secret files on a Render service. Supports **list**, **get**, **set**, **delete**, and **replace_all**. Retrieved secret-file content is returned as a Slate text attachment, not inline output.`
})
  .input(
    z.object({
      serviceId: z.string().describe('The service ID (e.g., srv-abc123)'),
      action: z
        .enum(['list', 'get', 'set', 'delete', 'replace_all'])
        .describe('Secret-file action to perform'),
      fileName: z
        .string()
        .optional()
        .describe('Secret file name (required for get/set/delete)'),
      content: z.string().optional().describe('Secret file content (required for set)'),
      files: z
        .array(
          z.object({
            name: z.string().describe('Secret file name'),
            content: z.string().describe('Secret file content')
          })
        )
        .optional()
        .describe('Full secret-file set for replace_all'),
      limit: z.number().optional().describe('Maximum results for list'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      secretFiles: z.array(secretFileSummarySchema).optional().describe('Secret files'),
      secretFile: secretFileSummarySchema.optional().describe('Single secret file metadata'),
      attachmentCount: z.number().optional().describe('Number of Slate attachments returned'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action, serviceId } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.cursor) params.cursor = ctx.input.cursor;
      let data = await client.listServiceSecretFiles(serviceId, params);
      let secretFiles = (Array.isArray(data) ? data : []).map((item: any) => {
        let secretFile = item.secretFile || item;
        return { name: secretFile.name };
      });
      return {
        output: { secretFiles, success: true },
        message: `Found **${secretFiles.length}** secret file(s) on service \`${serviceId}\`.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.fileName) throw createApiServiceError('fileName is required for get');
      let secretFile = await client.getServiceSecretFile(serviceId, ctx.input.fileName);
      return {
        output: {
          secretFile: { name: secretFile.name ?? ctx.input.fileName },
          attachmentCount: 1,
          success: true
        },
        attachments: [createTextAttachment(secretFile.content ?? '', 'text/plain')],
        message: `Retrieved secret file \`${ctx.input.fileName}\` from service \`${serviceId}\`.`
      };
    }

    if (action === 'set') {
      if (!ctx.input.fileName) throw createApiServiceError('fileName is required for set');
      if (ctx.input.content === undefined)
        throw createApiServiceError('content is required for set');
      let secretFile = await client.setServiceSecretFile(
        serviceId,
        ctx.input.fileName,
        ctx.input.content
      );
      return {
        output: {
          secretFile: { name: secretFile.name ?? ctx.input.fileName },
          success: true
        },
        message: `Set secret file \`${ctx.input.fileName}\` on service \`${serviceId}\`.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.fileName) throw createApiServiceError('fileName is required for delete');
      await client.deleteServiceSecretFile(serviceId, ctx.input.fileName);
      return {
        output: { success: true },
        message: `Deleted secret file \`${ctx.input.fileName}\` from service \`${serviceId}\`.`
      };
    }

    if (!ctx.input.files || ctx.input.files.length === 0) {
      throw createApiServiceError('files is required for replace_all');
    }

    await client.updateServiceSecretFiles(serviceId, ctx.input.files);
    return {
      output: {
        secretFiles: ctx.input.files.map(file => ({ name: file.name })),
        success: true
      },
      message: `Replaced secret files on service \`${serviceId}\` with **${ctx.input.files.length}** file(s).`
    };
  })
  .build();
