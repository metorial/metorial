import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, uploadChatbotFiles } from '../lib/client';
import { spec } from '../spec';

export let uploadChatbotFilesTool = SlateTool.create(spec, {
  name: 'Upload Chatbot Files',
  key: 'upload_chatbot_files',
  description:
    'Upload files to a VectorShift chatbot conversation for document context. Return the conversation ID, knowledge base ID, uploaded file identifiers, and any per-file errors.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      chatbotId: z
        .string()
        .describe('Chatbot ID. Call list_chatbots to discover chatbot IDs.'),
      files: z
        .array(z.object({ rawBytes: z.string().min(1).describe('Base64-encoded file bytes') }))
        .min(1)
        .describe('Files to upload to the conversation'),
      conversationId: z
        .string()
        .optional()
        .describe('Existing conversation ID, or omit to let VectorShift create a conversation')
    })
  )
  .output(
    z.object({
      status: z.enum(['success', 'failed']).describe('Provider upload status'),
      conversationId: z.string().optional().describe('Conversation ID for follow-up messages'),
      knowledgeBaseId: z
        .string()
        .optional()
        .describe('Knowledge base used for conversation files'),
      uploadedFiles: z.array(z.string()).describe('Provider identifiers of uploaded files'),
      errors: z.array(z.string()).describe('Per-file errors reported by VectorShift')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await uploadChatbotFiles(api, ctx.input.chatbotId, ctx.input);
    let uploadedFiles: string[] = result.uploaded_files ?? [];
    let errors: string[] = result.errors ?? [];
    return {
      output: {
        status: result.status,
        conversationId: result.conversation_id,
        knowledgeBaseId: result.knowledge_base_id,
        uploadedFiles,
        errors
      },
      message: `Uploaded **${uploadedFiles.length}** file(s) to chatbot \`${ctx.input.chatbotId}\`; VectorShift reported **${errors.length}** error(s).`
    };
  })
  .build();
