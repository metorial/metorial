import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getChatLogs = SlateTool.create(spec, {
  name: 'Get Chat Logs',
  key: 'get_chat_logs',
  description: `Retrieves chat session logs. Lists all chat sessions or downloads the full chat transcript for a specific session.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z
        .string()
        .optional()
        .describe(
          'Optional session ID to get chat transcript for a specific session. Omit to list all chat sessions.'
        )
    })
  )
  .output(
    z.object({
      chatSessions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of chat sessions (when no sessionId provided)'),
      chatTranscript: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Chat transcript for a specific session')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.sessionId) {
      let transcript = await client.getChatSession(ctx.input.sessionId);
      return {
        output: { chatTranscript: transcript },
        message: `Retrieved chat transcript for session **${ctx.input.sessionId}**.`
      };
    }

    let result = await client.listChats();
    let chatSessions = Array.isArray(result) ? result : [];

    return {
      output: { chatSessions },
      message: `Found **${chatSessions.length}** chat session(s).`
    };
  })
  .build();
