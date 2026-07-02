import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let performWebTask = SlateTool.create(spec, {
  name: 'Perform AI Web Task',
  key: 'perform_web_task',
  description: `Submit a natural language prompt and an AI agent will autonomously navigate and complete a task in a browser. Supports multiple AI agents including browser-use, OpenAI CUA, Gemini, and Anthropic CUA. Can run synchronously (returns result directly) or asynchronously (returns a workflow ID to poll for status).`,
  instructions: [
    'For async execution, set async to true and use the Check AI Task Status tool to poll for results.',
    'Use secretValues to inject credentials without exposing them in the prompt.'
  ]
})
  .input(
    z.object({
      prompt: z.string().describe('Natural language description of the task to perform'),
      url: z
        .string()
        .optional()
        .describe('Target URL to navigate to before executing the task'),
      agent: z
        .enum(['browser-use', 'openai-cua', 'gemini-computer-use', 'anthropic-cua'])
        .optional()
        .describe('AI agent to use for task execution'),
      provider: z
        .enum(['openai', 'gemini', 'groq', 'azure', 'xai'])
        .optional()
        .describe('AI provider for the agent'),
      model: z
        .string()
        .optional()
        .describe('Specific model to use (e.g. "gpt-4o", "gemini-2.0-flash")'),
      maxSteps: z
        .number()
        .optional()
        .describe('Maximum number of steps the agent can take (default: 200)'),
      detectElements: z.boolean().optional().describe('Enable element detection on the page'),
      highlightElements: z
        .boolean()
        .optional()
        .describe('Highlight detected elements visually'),
      humanIntervention: z
        .boolean()
        .optional()
        .describe('Allow human intervention during task execution'),
      secretValues: z
        .record(z.string(), z.string())
        .optional()
        .describe('Secret key-value pairs for credential injection (not logged)'),
      outputSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON Schema for structured output from the agent'),
      async: z
        .boolean()
        .optional()
        .describe('If true, returns immediately with a workflow ID to poll'),
      sessionId: z
        .string()
        .optional()
        .describe('ID of an existing session to use instead of creating a new one')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Task status (for async tasks: "running")'),
      workflowId: z
        .string()
        .optional()
        .describe('Workflow ID to poll for status (async only)'),
      result: z.unknown().optional().describe('Task result (sync only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let result = await client.performWebTask(
      {
        prompt: input.prompt,
        url: input.url,
        agent: input.agent,
        provider: input.provider,
        model: input.model,
        max_steps: input.maxSteps,
        detect_elements: input.detectElements,
        highlight_elements: input.highlightElements,
        human_intervention: input.humanIntervention,
        secret_values: input.secretValues,
        output_schema: input.outputSchema,
        async: input.async
      },
      input.sessionId
    );

    if (input.async) {
      return {
        output: {
          status: result?.status ?? 'running',
          workflowId: result?.workflow_id
        },
        message: `AI task submitted asynchronously. Workflow ID: **${result?.workflow_id}**. Poll for status using the Check AI Task Status tool.`
      };
    }

    return {
      output: {
        status: 'completed',
        result: result?.result ?? result
      },
      message: `AI task completed successfully.`
    };
  })
  .build();
