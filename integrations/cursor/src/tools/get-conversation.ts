import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
import { spec } from '../spec';

export let getConversation = SlateTool.create(spec, {
  name: 'Get Agent Conversation',
  key: 'get_agent_conversation',
  description: `Retrieve the full conversation history of a Cursor cloud agent, including both user prompts and assistant responses. Not available for deleted agents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('ID of the agent to get the conversation for')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Unique identifier for the conversation'),
      messages: z.array(
        z.object({
          messageId: z.string().describe('Unique identifier for the message'),
          type: z.string().describe('Message type: user_message or assistant_message'),
          text: z.string().describe('Message text content')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CloudAgentsClient({ token: ctx.auth.token });
    let result = await client.getConversation(ctx.input.agentId);

    return {
      output: {
        conversationId: result.id,
        messages: result.messages.map(m => ({
          messageId: m.id,
          type: m.type,
          text: m.text
        }))
      },
      message: `Retrieved **${result.messages.length}** message(s) from agent conversation.`
    };
  })
  .build();
