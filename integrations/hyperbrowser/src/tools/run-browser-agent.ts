import { SlateTool } from 'slates';
import { z } from 'zod';
import { HyperbrowserClient } from '../lib/client';
import { sessionOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let runBrowserAgent = SlateTool.create(spec, {
  name: 'Run Browser Agent',
  key: 'run_browser_agent',
  description: `Run an AI browser agent that autonomously operates a browser to complete a natural language task.
Supports multiple agent types: **Browser Use** (fast, lightweight), **Claude Computer Use** (complex tasks), and **OpenAI CUA** (general-purpose).
Starts the agent task, waits for completion, and returns the final result and step-by-step history.`,
  instructions: [
    'Provide a clear, detailed task description in natural language.',
    'Choose the agent type based on the task complexity: browser_use for speed, claude for complex tasks, openai_cua for general purpose.',
    'Optionally provide custom LLM API keys if using your own models.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      task: z.string().describe('Natural language description of the browser task to perform'),
      agentType: z
        .enum(['browser_use', 'claude_computer_use', 'openai_cua'])
        .default('browser_use')
        .describe('Type of AI agent to use'),
      llm: z
        .string()
        .optional()
        .describe(
          'LLM model to use (e.g., "gemini-2.0-flash", "claude-sonnet-4-5", "computer-use-preview")'
        ),
      maxSteps: z
        .number()
        .optional()
        .describe('Maximum number of actions the agent can take (default: 20)'),
      maxFailures: z
        .number()
        .optional()
        .describe('Maximum consecutive failures before stopping (default: 3)'),
      useVision: z
        .boolean()
        .optional()
        .describe('Enable vision mode for the agent (Browser Use only, default: true)'),
      keepBrowserOpen: z
        .boolean()
        .optional()
        .describe('Keep the browser session open after task completion'),
      sessionId: z.string().optional().describe('Existing session ID to reuse'),
      sessionOptions: sessionOptionsSchema,
      useCustomApiKeys: z.boolean().optional().describe('Whether to use custom LLM API keys'),
      apiKeys: z
        .object({
          openai: z.string().optional().describe('OpenAI API key'),
          anthropic: z.string().optional().describe('Anthropic API key'),
          google: z.string().optional().describe('Google AI API key')
        })
        .optional()
        .describe('Custom API keys for the underlying LLM providers')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Agent task job identifier'),
      liveUrl: z.string().optional().describe('URL for live viewing of the agent in action'),
      status: z.string().describe('Task status'),
      finalResult: z
        .string()
        .optional()
        .nullable()
        .describe('Final output/result of the agent task'),
      steps: z.array(z.any()).optional().describe('Step-by-step execution history'),
      error: z.string().optional().describe('Error message if task failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });

    let params: Record<string, unknown> = { task: ctx.input.task };
    if (ctx.input.llm) params.llm = ctx.input.llm;
    if (ctx.input.maxSteps !== undefined) params.maxSteps = ctx.input.maxSteps;
    if (ctx.input.maxFailures !== undefined) params.maxFailures = ctx.input.maxFailures;
    if (ctx.input.useVision !== undefined) params.useVision = ctx.input.useVision;
    if (ctx.input.keepBrowserOpen !== undefined)
      params.keepBrowserOpen = ctx.input.keepBrowserOpen;
    if (ctx.input.sessionId) params.sessionId = ctx.input.sessionId;
    if (ctx.input.sessionOptions) params.sessionOptions = ctx.input.sessionOptions;
    if (ctx.input.useCustomApiKeys !== undefined)
      params.useCustomApiKeys = ctx.input.useCustomApiKeys;
    if (ctx.input.apiKeys) params.apiKeys = ctx.input.apiKeys;

    let agentType = ctx.input.agentType;
    ctx.info(`Starting ${agentType} agent task`);

    let startResponse: { jobId: string; liveUrl?: string };
    let getStatus: (jobId: string) => Promise<{ status: string }>;
    let getResult: (jobId: string) => Promise<Record<string, unknown>>;

    if (agentType === 'claude_computer_use') {
      startResponse = await client.startClaudeComputerUseTask(params);
      getStatus = id => client.getClaudeComputerUseTaskStatus(id);
      getResult = id => client.getClaudeComputerUseTaskResult(id);
    } else if (agentType === 'openai_cua') {
      startResponse = await client.startCuaTask(params);
      getStatus = id => client.getCuaTaskStatus(id);
      getResult = id => client.getCuaTaskResult(id);
    } else {
      startResponse = await client.startBrowserUseTask(params);
      getStatus = id => client.getBrowserUseTaskStatus(id);
      getResult = id => client.getBrowserUseTaskResult(id);
    }

    let jobId = startResponse.jobId;
    let liveUrl = startResponse.liveUrl;

    ctx.progress(`Agent started. Job: ${jobId}${liveUrl ? ` | Live: ${liveUrl}` : ''}`);

    let result = await client.pollForCompletion(
      () => getStatus(jobId),
      () => getResult(jobId),
      { maxAttempts: 300, intervalMs: 2000 }
    );

    let data = result.data as Record<string, unknown> | undefined;
    let finalResult = data?.finalResult as string | null | undefined;
    let steps = data?.steps as unknown[] | undefined;

    return {
      output: {
        jobId,
        liveUrl,
        status: result.status as string,
        finalResult,
        steps,
        error: result.error as string | undefined
      },
      message: finalResult
        ? `Agent completed. Result: ${finalResult.substring(0, 500)}`
        : `Agent task completed with status: **${result.status}**`
    };
  })
  .build();
