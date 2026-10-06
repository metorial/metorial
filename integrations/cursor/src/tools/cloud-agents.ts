import { createApiServiceError, getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import {
  agentRunSchema,
  CurrentAgentsClient,
  cloudAgentSchema,
  environmentSchema,
  modelParameterSchema,
  repositorySchema
} from '../lib/current-client';
import { spec } from '../spec';

const agentId = z
  .string()
  .min(1)
  .describe('Agent ID returned by create_cloud_agent or list_cloud_agents.');
const runId = z
  .string()
  .min(1)
  .describe('Run ID returned by create_cloud_agent, create_agent_run, or list_agent_runs.');
const limit = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe('Page size, default 20 and maximum 100.');
const cursor = z
  .string()
  .optional()
  .describe('nextCursor from the previous response. Omit for the first page.');
const imageSchema = z.object({
  data: z
    .string()
    .optional()
    .describe('Base64-encoded image bytes. Provide data or url, never both.'),
  mimeType: z
    .enum(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
    .optional()
    .describe('Required with data.'),
  url: z
    .url({ protocol: /^https?$/ })
    .optional()
    .describe('Public image URL, as an alternative to data.')
});
const promptFields = {
  promptText: z.string().min(1).describe('Instructions for this run.'),
  promptImages: z
    .array(imageSchema)
    .max(5)
    .optional()
    .describe('Up to five images, each at most 15 MB.'),
  mode: z
    .enum(['agent', 'plan'])
    .optional()
    .describe('agent implements changes; plan explores and drafts a plan.')
};
const validateImages = (images?: z.infer<typeof imageSchema>[]) => {
  for (const image of images ?? []) {
    if (!!image.data === !!image.url || (image.data && !image.mimeType)) {
      throw createApiServiceError(
        'Each image needs either a URL or base64 data with a MIME type.'
      );
    }
    if (image.data && getBase64ByteLength(image.data) > 15 * 1024 * 1024) {
      throw createApiServiceError('Each image must be at most 15 MB.');
    }
  }
};

export const createCloudAgent = SlateTool.create(spec, {
  name: 'Create Cloud Agent',
  key: 'create_cloud_agent',
  description:
    'Create a durable Cursor cloud agent and its initial run using the current public beta API. Supports connected GitHub, GitLab, Bitbucket Cloud, and Azure DevOps repositories, multiple repositories, and no-repository tasks.',
  instructions: [
    'Use list_models for model IDs and parameter values. GitHub repositories can be discovered with list_repositories; use known connected repository URLs for other providers.',
    'Use get_agent_run to read execution status. Agent status describes durable lifecycle, rather than whether a prompt completed.'
  ],
  constraints: [
    'Public beta API may change.',
    'Named cloud environments cannot be combined with repositories.',
    'Self-hosted machines and repo-bound pools accept only one repository; multi-repository pools must support any-repo mode.',
    'Runs can incur account charges.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      ...promptFields,
      name: z
        .string()
        .max(100)
        .optional()
        .describe('Agent display name, at most 100 characters.'),
      modelId: z
        .string()
        .optional()
        .describe('Model ID from list_models. Omit to use the configured default.'),
      modelParams: z
        .array(modelParameterSchema)
        .optional()
        .describe('Parameters supported by the selected model from list_models.'),
      repositories: z
        .array(repositorySchema.extend({ url: z.url({ protocol: /^https?$/ }) }))
        .max(20)
        .optional()
        .describe(
          'Connected repository URLs and optional startingRef or prUrl. Repository URL is still required when a PR URL is present.'
        ),
      environment: environmentSchema
        .optional()
        .describe(
          'Named cloud environment or self-hosted pool/machine. Omit for a default cloud VM.'
        ),
      workOnCurrentBranch: z
        .boolean()
        .optional()
        .describe(
          'When true, push directly to the starting branch or PR head. Default false creates a new branch.'
        ),
      autoCreatePr: z
        .boolean()
        .optional()
        .describe('Open a pull request when the run completes.'),
      skipReviewerRequest: z
        .boolean()
        .optional()
        .describe('Skip requesting the user as a PR reviewer when autoCreatePr is true.')
    })
  )
  .output(z.object({ agent: cloudAgentSchema, run: agentRunSchema }))
  .handleInvocation(async ctx => {
    validateImages(ctx.input.promptImages);
    if (ctx.input.modelParams && !ctx.input.modelId)
      throw createApiServiceError(
        'Provide modelId with modelParams, or omit both to use the default model.'
      );
    if (
      ctx.input.environment?.type === 'cloud' &&
      ctx.input.environment.name &&
      ctx.input.repositories !== undefined
    )
      throw createApiServiceError(
        'Choose a named cloud environment or repositories, not both.'
      );
    if (ctx.input.environment?.type === 'machine' && (ctx.input.repositories?.length ?? 0) > 1)
      throw createApiServiceError(
        'A self-hosted machine accepts only one repository. Use a named any-repo pool for multiple repositories.'
      );
    if (
      ctx.input.environment?.type === 'pool' &&
      (!ctx.input.environment.name || ctx.input.environment.name === 'default') &&
      (ctx.input.repositories?.length ?? 0) > 1
    )
      throw createApiServiceError(
        'The default pool accepts one repository. Use a named any-repo pool for multiple repositories.'
      );
    const output = await new CurrentAgentsClient(ctx.auth).createAgent({
      prompt: { text: ctx.input.promptText, images: ctx.input.promptImages },
      name: ctx.input.name,
      model: ctx.input.modelId
        ? { id: ctx.input.modelId, params: ctx.input.modelParams }
        : undefined,
      repos: ctx.input.repositories,
      env: ctx.input.environment,
      workOnCurrentBranch: ctx.input.workOnCurrentBranch,
      autoCreatePR: ctx.input.autoCreatePr,
      skipReviewerRequest: ctx.input.skipReviewerRequest,
      mode: ctx.input.mode
    });
    return {
      output,
      message: `Created **${output.agent.name}** with initial run **${output.run.id}** (${output.run.status}).`
    };
  })
  .build();

export const listCloudAgents = SlateTool.create(spec, {
  name: 'List Cloud Agents',
  key: 'list_cloud_agents',
  description:
    'List durable Cursor cloud agents, newest first, using the current public beta API. Returns agent identity, lifecycle state, URL, and latest run ID. Call get_cloud_agent for repositories and get_agent_run for execution state.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit,
      cursor,
      prUrl: z.string().optional().describe('Filter by pull or merge request URL.'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived agents. Default true.')
    })
  )
  .output(z.object({ agents: z.array(cloudAgentSchema), nextCursor: z.string().optional() }))
  .handleInvocation(async ctx => {
    const result = await new CurrentAgentsClient(ctx.auth).listAgents(ctx.input);
    return {
      output: { agents: result.items, nextCursor: result.nextCursor },
      message: `Found **${result.items.length}** cloud agent(s).`
    };
  })
  .build();

export const getCloudAgent = SlateTool.create(spec, {
  name: 'Get Cloud Agent',
  key: 'get_cloud_agent',
  description:
    'Get durable cloud agent metadata, repositories, branch settings, and latest run ID using the current public beta API. Use get_agent_run for completion state and final results.',
  tags: { readOnly: true }
})
  .input(z.object({ agentId }))
  .output(cloudAgentSchema)
  .handleInvocation(async ctx => {
    const output = await new CurrentAgentsClient(ctx.auth).getAgent(ctx.input.agentId);
    return { output, message: `Agent **${output.name}** is ${output.status}.` };
  })
  .build();

export const createAgentRun = SlateTool.create(spec, {
  name: 'Create Agent Run',
  key: 'create_agent_run',
  description:
    'Send a new prompt to a durable cloud agent, reusing its conversation and workspace. Returns the new run ID for status checks.',
  constraints: [
    'Only one run can be active per agent. Wait for the current run to finish or use cancel_agent_run.',
    'Archived agents must be unarchived first with manage_cloud_agent.',
    'Runs can incur account charges.'
  ],
  tags: { readOnly: false }
})
  .input(z.object({ agentId, ...promptFields }))
  .output(z.object({ run: agentRunSchema }))
  .handleInvocation(async ctx => {
    validateImages(ctx.input.promptImages);
    const output = await new CurrentAgentsClient(ctx.auth).createRun(
      ctx.input.agentId,
      { text: ctx.input.promptText, images: ctx.input.promptImages },
      ctx.input.mode
    );
    return { output, message: `Created run **${output.run.id}** (${output.run.status}).` };
  })
  .build();

export const listAgentRuns = SlateTool.create(spec, {
  name: 'List Agent Runs',
  key: 'list_agent_runs',
  description: 'List a durable cloud agent’s runs, newest first, with pagination.',
  tags: { readOnly: true }
})
  .input(z.object({ agentId, limit, cursor }))
  .output(z.object({ runs: z.array(agentRunSchema), nextCursor: z.string().optional() }))
  .handleInvocation(async ctx => {
    const result = await new CurrentAgentsClient(ctx.auth).listRuns(ctx.input.agentId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });
    return {
      output: { runs: result.items, nextCursor: result.nextCursor },
      message: `Found **${result.items.length}** run(s).`
    };
  })
  .build();

export const getAgentRun = SlateTool.create(spec, {
  name: 'Get Agent Run',
  key: 'get_agent_run',
  description:
    'Read run execution status, timestamps, duration, final reply, and pushed branches. Run statuses include CREATING, RUNNING, FINISHED, ERROR, CANCELLED, and EXPIRED. Git metadata is the agent’s current snapshot, shared across its runs.',
  tags: { readOnly: true }
})
  .input(z.object({ agentId, runId }))
  .output(agentRunSchema)
  .handleInvocation(async ctx => {
    const output = await new CurrentAgentsClient(ctx.auth).getRun(
      ctx.input.agentId,
      ctx.input.runId
    );
    return { output, message: `Run **${output.id}** is ${output.status}.` };
  })
  .build();

export const cancelAgentRun = SlateTool.create(spec, {
  name: 'Cancel Agent Run',
  key: 'cancel_agent_run',
  description:
    'Cancel an active cloud agent run. Cancellation is terminal for that run; create_agent_run starts a new prompt on the same conversation.',
  constraints: ['Terminal runs cannot be cancelled; Cursor returns a conflict.'],
  tags: { readOnly: false }
})
  .input(z.object({ agentId, runId }))
  .output(z.object({ runId: z.string() }))
  .handleInvocation(async ctx => {
    const result = await new CurrentAgentsClient(ctx.auth).cancelRun(
      ctx.input.agentId,
      ctx.input.runId
    );
    return { output: { runId: result.id }, message: `Cancelled run **${result.id}**.` };
  })
  .build();

export const manageCloudAgent = SlateTool.create(spec, {
  name: 'Manage Cloud Agent',
  key: 'manage_cloud_agent',
  description:
    'Archive, unarchive, or permanently delete a durable cloud agent. Archive retains readable metadata but prevents new runs. Unarchive allows follow-up runs. Delete irreversibly removes the agent.',
  constraints: ['Archive and unarchive are idempotent.'],
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ agentId, action: z.enum(['archive', 'unarchive', 'delete']) }))
  .output(
    z.object({ agentId: z.string(), action: z.enum(['archive', 'unarchive', 'delete']) })
  )
  .handleInvocation(async ctx => {
    const result = await new CurrentAgentsClient(ctx.auth).manageAgent(
      ctx.input.agentId,
      ctx.input.action
    );
    return {
      output: { agentId: result.id, action: ctx.input.action },
      message: `Completed ${ctx.input.action} for **${result.id}**.`
    };
  })
  .build();
