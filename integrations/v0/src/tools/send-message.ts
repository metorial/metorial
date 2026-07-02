import { SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessageTool = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a follow-up message to an existing V0 chat to refine or iterate on generated code. The AI will process the message and produce a new version of the code. Use this for iterative development within a chat session.`,
  instructions: [
    'The chatId must reference an existing chat created via "Create Chat" or "Initialize Chat".',
    'Each message generates a new version of the code, accessible via the demoUrl.'
  ]
})
  .input(
    z.object({
      chatId: z.string().describe('The chat to send the message to'),
      message: z.string().describe('The prompt or instruction to refine the generated code'),
      system: z.string().optional().describe('System-level context for this message'),
      responseMode: z
        .enum(['sync', 'async'])
        .optional()
        .describe('Whether to wait for the AI response (sync) or return immediately (async)')
    })
  )
  .output(
    z.object({
      chatId: z.string().describe('Chat identifier'),
      name: z.string().optional().describe('Chat name'),
      privacy: z.string().describe('Chat visibility'),
      latestVersionId: z.string().optional().describe('ID of the new version'),
      latestVersionStatus: z.string().optional().describe('Status of the new version'),
      demoUrl: z.string().optional().describe('Demo URL for the new version'),
      webUrl: z.string().describe('Web URL to view the chat'),
      messageCount: z.number().describe('Total number of messages in the chat')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let { chatId, ...messageParams } = ctx.input;
    let result = await client.sendMessage(chatId, messageParams);

    let messageCount = (result.messages || []).length;

    return {
      output: {
        chatId: result.id,
        name: result.name,
        privacy: result.privacy,
        latestVersionId: result.latestVersion?.id,
        latestVersionStatus: result.latestVersion?.status,
        demoUrl: result.latestVersion?.demoUrl,
        webUrl: result.webUrl,
        messageCount
      },
      message: `Sent message to chat **${result.name || result.id}**. ${result.latestVersion?.demoUrl ? `[Preview](${result.latestVersion.demoUrl})` : `Version status: ${result.latestVersion?.status || 'unknown'}`}`
    };
  })
  .build();
