import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let chatQuery = SlateTool.create(spec, {
  name: 'Chat with Codebase',
  key: 'chat_query',
  description: `Query your codebase using natural language through Entelligence's AI-powered chat. Ask questions about code structure, pull requests, issues, and team contributions. Supports specialized agent modes for different types of analysis.

Use this to understand code, find implementations, explain architecture, list PRs, generate summaries, and more. Supports slash commands like \`/findCode\`, \`/explain\`, \`/listPRs\`, \`/issueThemes\`, \`/onboard\`, and \`/visualize\`.`,
  instructions: [
    'Provide a clear, specific question for best results.',
    'Use conversation history for multi-turn follow-up questions.',
    'Enable advancedAgent for complex reasoning tasks that span multiple sources.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      question: z.string().describe('Natural language question to ask about the codebase'),
      conversationHistory: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']).describe('Role of the message sender'),
            content: z.string().describe('Message content')
          })
        )
        .optional()
        .describe('Previous conversation messages for multi-turn context'),
      enableArtifacts: z
        .boolean()
        .optional()
        .describe('Enable artifact generation in responses (e.g., code snippets, diagrams)'),
      advancedAgent: z
        .boolean()
        .optional()
        .describe(
          'Enable advanced agent mode for complex cross-source reasoning across PRs, issues, and code'
        ),
      enableDocs: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include documentation context in responses'),
      limitSources: z
        .number()
        .optional()
        .describe('Maximum number of source references to include (default: 5)')
    })
  )
  .output(
    z.object({
      answer: z.string().describe('AI-generated answer to the question'),
      references: z.array(z.string()).describe('Source reference URLs cited in the answer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      repoName: ctx.config.repoName,
      organization: ctx.config.organization
    });

    ctx.progress('Querying codebase...');

    let result = await client.chatQuery({
      question: ctx.input.question,
      history: ctx.input.conversationHistory,
      enableArtifacts: ctx.input.enableArtifacts,
      advancedAgent: ctx.input.advancedAgent,
      enableDocs: ctx.input.enableDocs,
      limitSources: ctx.input.limitSources
    });

    let refSummary =
      result.references.length > 0
        ? `\n\nReferenced ${result.references.length} source(s).`
        : '';

    return {
      output: result,
      message: `**Answer:**\n\n${result.answer}${refSummary}`
    };
  })
  .build();
