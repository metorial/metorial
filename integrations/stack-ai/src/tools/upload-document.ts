import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { orgIdInput } from '../lib/deployment';
import { uploadFields } from '../lib/schemas';
import { spec } from '../spec';

export const uploadDocument = SlateTool.create(spec, {
  key: 'upload_document',
  name: 'Upload Workflow Document',
  description:
    'Upload a file to a deployed workflow Files Node for a specific user or conversation. The workflow must already contain the Files Node. Use list_documents to read back the user bucket.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      orgId: orgIdInput,
      flowId: z
        .string()
        .min(1)
        .describe('Deployed flow ID from Export View > API or get_organization_analytics'),
      nodeId: z.string().min(1).describe('Files Node ID from the workflow, for example doc-0'),
      userId: z
        .string()
        .min(1)
        .describe('User or user-conversation ID whose document bucket receives the file'),
      ...uploadFields
    })
  )
  .output(
    z.object({
      fileName: z.string(),
      flowId: z.string(),
      nodeId: z.string(),
      userId: z.string(),
      accepted: z.boolean().describe('Whether the upload endpoint accepted the request')
    })
  )
  .handleInvocation(async ctx => {
    await createClient(ctx, ctx.input.orgId).uploadDocument(
      ctx.input.flowId,
      ctx.input.nodeId,
      ctx.input.userId,
      ctx.input.fileName,
      ctx.input.content,
      ctx.input.encoding ?? 'text',
      ctx.input.mimeType
    );
    return {
      output: {
        fileName: ctx.input.fileName,
        flowId: ctx.input.flowId,
        nodeId: ctx.input.nodeId,
        userId: ctx.input.userId,
        accepted: true
      },
      message: `Uploaded ${ctx.input.fileName} to the workflow document bucket. Use list_documents to verify the stored file.`
    };
  })
  .build();
