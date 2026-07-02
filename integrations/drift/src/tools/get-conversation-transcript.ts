import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

let transcriptFormatSchema = z
  .enum(['formatted', 'json'])
  .optional()
  .describe('Transcript format. "formatted" returns text; "json" returns raw JSON.');

export let getConversationTranscript = SlateTool.create(spec, {
  name: 'Get Conversation Transcript',
  key: 'get_conversation_transcript',
  description: `Export a Drift conversation transcript as a Slate attachment. The transcript content is returned as an attachment, not inline output.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('Drift conversation ID'),
      format: transcriptFormatSchema
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Drift conversation ID'),
      format: z.string().describe('Returned transcript format'),
      mimeType: z.string().describe('Attachment MIME type'),
      byteSize: z.number().describe('UTF-8 byte size of the transcript attachment'),
      attachmentCount: z.number().describe('Number of transcript attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);
    let format = ctx.input.format ?? 'formatted';
    let transcript = await client.getConversationTranscript(ctx.input.conversationId, format);
    let content =
      format === 'json'
        ? JSON.stringify(transcript, null, 2)
        : typeof transcript === 'string'
          ? transcript
          : JSON.stringify(transcript, null, 2);
    let mimeType = format === 'json' ? 'application/json' : 'text/plain';

    return {
      output: {
        conversationId: ctx.input.conversationId,
        format,
        mimeType,
        byteSize: Buffer.byteLength(content, 'utf8'),
        attachmentCount: 1
      },
      attachments: [createTextAttachment(content, mimeType)],
      message: `Exported ${format} transcript for conversation \`${ctx.input.conversationId}\`.`
    };
  })
  .build();
