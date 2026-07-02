import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
import { spec } from '../spec';

let imageSchema = z.object({
  data: z.string().describe('Base64-encoded image data'),
  dimension: z
    .object({
      width: z.number().describe('Image width in pixels'),
      height: z.number().describe('Image height in pixels')
    })
    .describe('Image dimensions')
});

export let launchAgent = SlateTool.create(spec, {
  name: 'Launch Agent',
  key: 'launch_agent',
  description: `Launch a new Cursor cloud agent to work on a GitHub repository. The agent receives a natural language prompt describing the task and operates on the specified repository. It can optionally create a pull request with its changes.`,
  instructions: [
    'Either a repository URL or a PR URL must be provided in the source.',
    'If autoCreatePr is true, the agent will open a PR when finished.'
  ],
  constraints: ['Maximum 5 images per prompt.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      promptText: z.string().describe('Natural language instructions for the agent'),
      promptImages: z
        .array(imageSchema)
        .max(5)
        .optional()
        .describe('Up to 5 images to include with the prompt'),
      model: z.string().optional().describe('AI model to use (omit for automatic selection)'),
      sourceRepository: z
        .string()
        .optional()
        .describe('GitHub repository URL (e.g. https://github.com/org/repo)'),
      sourceRef: z.string().optional().describe('Git ref (branch, tag, commit) to start from'),
      sourcePrUrl: z
        .string()
        .optional()
        .describe('Pull request URL to work on instead of a repository'),
      autoCreatePr: z
        .boolean()
        .optional()
        .describe('Whether to automatically create a PR with changes'),
      branchName: z.string().optional().describe("Custom branch name for the agent's work"),
      autoBranch: z.boolean().optional().describe('Automatically generate a branch name'),
      openAsCursorGithubApp: z
        .boolean()
        .optional()
        .describe('Open the PR as the Cursor GitHub App'),
      skipReviewerRequest: z
        .boolean()
        .optional()
        .describe('Skip requesting reviewers on the PR'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive webhook notifications on agent completion'),
      webhookSecret: z
        .string()
        .optional()
        .describe('Secret for signing webhook payloads (min 32 characters)')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('Unique identifier of the launched agent'),
      agentName: z.string().describe('Name of the agent'),
      status: z.string().describe('Current status of the agent'),
      repository: z.string().describe('Source repository URL'),
      createdAt: z.string().describe('ISO 8601 timestamp of agent creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CloudAgentsClient({ token: ctx.auth.token });

    let result = await client.launchAgent({
      prompt: {
        text: ctx.input.promptText,
        images: ctx.input.promptImages
      },
      model: ctx.input.model,
      source: {
        repository: ctx.input.sourceRepository,
        ref: ctx.input.sourceRef,
        prUrl: ctx.input.sourcePrUrl
      },
      target: {
        autoCreatePr: ctx.input.autoCreatePr,
        branchName: ctx.input.branchName,
        autoBranch: ctx.input.autoBranch,
        openAsCursorGithubApp: ctx.input.openAsCursorGithubApp,
        skipReviewerRequest: ctx.input.skipReviewerRequest
      },
      webhook: ctx.input.webhookUrl
        ? {
            url: ctx.input.webhookUrl,
            secret: ctx.input.webhookSecret
          }
        : undefined
    });

    return {
      output: {
        agentId: result.id,
        agentName: result.name,
        status: result.status,
        repository: result.source.repository,
        createdAt: result.createdAt
      },
      message: `Launched agent **${result.name}** (${result.id}) with status \`${result.status}\` on repository \`${result.source.repository}\`.`
    };
  })
  .build();
