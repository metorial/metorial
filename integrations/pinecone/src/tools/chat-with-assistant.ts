import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeAssistantClient, PineconeControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let chatWithAssistantTool = SlateTool.create(spec, {
  name: 'Chat with Assistant',
  key: 'chat_with_assistant',
  description: `Ask questions to a Pinecone Assistant and receive context-aware answers grounded in uploaded documents, with inline citations. Supports multi-turn conversations, metadata-based document filtering, and LLM model selection (GPT-4o or Claude 3.5 Sonnet).`,
  instructions: [
    'The assistant must exist and have documents uploaded to it before chatting.',
    'Use the assistantHost from the assistant description, or provide the assistant name to auto-resolve.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      assistantName: z.string().describe('Name of the assistant to chat with'),
      messages: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']).describe('Role of the message sender'),
            content: z.string().describe('Message content')
          })
        )
        .min(1)
        .describe('Conversation messages (include history for multi-turn)'),
      model: z
        .enum(['gpt-4o', 'claude-3-5-sonnet'])
        .optional()
        .describe('LLM model to use for generation'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata filter to restrict document retrieval'),
      jsonResponse: z.boolean().optional().describe('Request a JSON-formatted response'),
      includeHighlights: z
        .boolean()
        .optional()
        .describe('Include supporting document excerpts')
    })
  )
  .output(
    z.object({
      responseContent: z.string().describe('Assistant response text'),
      model: z.string().describe('LLM model used'),
      finishReason: z.string().describe('Reason the response ended (stop, length, etc.)'),
      citations: z
        .array(z.any())
        .optional()
        .describe('Citations referencing source documents and pages'),
      promptTokens: z.number().optional().describe('Prompt tokens used'),
      completionTokens: z.number().optional().describe('Completion tokens used'),
      totalTokens: z.number().optional().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let controlClient = new PineconeControlPlaneClient({ token: ctx.auth.token });

    let assistant = await controlClient.describeAssistant(ctx.input.assistantName);
    let assistantHost = assistant.host || `https://prod-1-data.ke.pinecone.io`;

    let assistantClient = new PineconeAssistantClient({
      token: ctx.auth.token,
      assistantHost
    });

    let result = await assistantClient.chat(ctx.input.assistantName, {
      messages: ctx.input.messages,
      model: ctx.input.model,
      filter: ctx.input.filter,
      json_response: ctx.input.jsonResponse,
      include_highlights: ctx.input.includeHighlights
    });

    return {
      output: {
        responseContent: result.message?.content || '',
        model: result.model || '',
        finishReason: result.finish_reason || 'stop',
        citations: result.citations,
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        totalTokens: result.usage?.total_tokens
      },
      message: `Assistant responded using \`${result.model}\`. ${result.citations?.length ? `Cited **${result.citations.length}** source${result.citations.length === 1 ? '' : 's'}.` : ''}`
    };
  })
  .build();
