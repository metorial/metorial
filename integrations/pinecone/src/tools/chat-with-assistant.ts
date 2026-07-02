import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeAssistantClient, PineconeControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let chatWithAssistantTool = SlateTool.create(spec, {
  name: 'Chat with Assistant',
  key: 'chat_with_assistant',
  description: `Ask questions to a Pinecone Assistant and receive context-aware answers grounded in uploaded documents, with inline citations. Supports multi-turn conversations, metadata-based document filtering, model selection, and highlight/context controls.`,
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
      model: z.string().optional().describe('LLM model to use for generation'),
      temperature: z
        .number()
        .optional()
        .describe('Optional model temperature for response randomness'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata filter to restrict document retrieval'),
      jsonResponse: z.boolean().optional().describe('Request a JSON-formatted response'),
      includeHighlights: z
        .boolean()
        .optional()
        .describe('Include supporting document excerpts'),
      contextOptions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Advanced context snippet options passed to Pinecone')
    })
  )
  .output(
    z.object({
      chatId: z.string().optional().describe('Pinecone chat response ID'),
      responseContent: z.string().describe('Assistant response text'),
      model: z.string().describe('LLM model used'),
      finishReason: z.string().describe('Reason the response ended (stop, length, etc.)'),
      citations: z
        .array(z.any())
        .optional()
        .describe('Citations referencing source documents and pages'),
      promptTokens: z.number().optional().describe('Prompt tokens used'),
      completionTokens: z.number().optional().describe('Completion tokens used'),
      totalTokens: z.number().optional().describe('Total tokens used'),
      contextSnippetCount: z
        .number()
        .optional()
        .describe('Number of snippets supplied to the model')
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
      temperature: ctx.input.temperature,
      filter: ctx.input.filter,
      json_response: ctx.input.jsonResponse,
      include_highlights: ctx.input.includeHighlights,
      context_options: ctx.input.contextOptions
    });

    return {
      output: {
        chatId: result.id,
        responseContent: result.message?.content || '',
        model: result.model || '',
        finishReason: result.finish_reason || 'stop',
        citations: result.citations,
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        totalTokens: result.usage?.total_tokens,
        contextSnippetCount: result.context_snippet_count
      },
      message: `Assistant responded using \`${result.model}\`. ${result.citations?.length ? `Cited **${result.citations.length}** source${result.citations.length === 1 ? '' : 's'}.` : ''}`
    };
  })
  .build();
