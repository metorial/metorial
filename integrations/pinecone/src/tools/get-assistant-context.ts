import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeAssistantClient, PineconeControlPlaneClient } from '../lib/client';
import { pineconeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getAssistantContextTool = SlateTool.create(spec, {
  name: 'Get Assistant Context',
  key: 'get_assistant_context',
  description: `Retrieve context snippets from a Pinecone Assistant without asking the assistant to generate an answer. Use this for RAG workflows that pass retrieved snippets to another model or agent.`,
  instructions: [
    'Provide exactly one context input: query or messages.',
    'The assistant must exist and have processed files before useful snippets can be returned.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      assistantName: z.string().describe('Name of the assistant'),
      query: z.string().optional().describe('Search query for context retrieval'),
      messages: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']).describe('Role of the message sender'),
            content: z.string().describe('Message content')
          })
        )
        .optional()
        .describe('Conversation messages for context retrieval'),
      filter: z.record(z.string(), z.any()).optional().describe('Metadata filter'),
      topK: z
        .number()
        .int()
        .min(1)
        .max(64)
        .optional()
        .describe('Maximum number of snippets to return'),
      snippetSize: z
        .number()
        .int()
        .min(512)
        .max(8192)
        .optional()
        .describe('Maximum context snippet size in tokens'),
      multimodal: z
        .boolean()
        .optional()
        .describe('Whether to retrieve image-related context snippets'),
      includeBinaryContent: z
        .boolean()
        .optional()
        .describe('Whether multimodal snippets should include base64 image data')
    })
  )
  .output(
    z.object({
      contextId: z.string().optional().describe('Context response ID'),
      snippets: z.array(z.any()).describe('Context snippets returned by Pinecone'),
      usage: z.record(z.string(), z.any()).optional().describe('Usage metrics')
    })
  )
  .handleInvocation(async ctx => {
    if ((ctx.input.query ? 1 : 0) + (ctx.input.messages ? 1 : 0) !== 1) {
      throw pineconeServiceError('Provide exactly one of query or messages.');
    }

    let controlClient = new PineconeControlPlaneClient({ token: ctx.auth.token });
    let assistant = await controlClient.describeAssistant(ctx.input.assistantName);
    let assistantHost = assistant.host || `https://prod-1-data.ke.pinecone.io`;

    let assistantClient = new PineconeAssistantClient({
      token: ctx.auth.token,
      assistantHost
    });

    let result = await assistantClient.getContext(ctx.input.assistantName, {
      query: ctx.input.query,
      messages: ctx.input.messages,
      filter: ctx.input.filter,
      top_k: ctx.input.topK,
      snippet_size: ctx.input.snippetSize,
      multimodal: ctx.input.multimodal,
      include_binary_content: ctx.input.includeBinaryContent
    });

    let snippets = result.snippets || [];

    return {
      output: {
        contextId: result.id,
        snippets,
        usage: result.usage
      },
      message: `Retrieved **${snippets.length}** context snippet${snippets.length === 1 ? '' : 's'} from assistant \`${ctx.input.assistantName}\`.`
    };
  })
  .build();
