import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { circleCiValidationError, validatePipelineParameters } from '../lib/validation';
import { spec } from '../spec';

let supportedProviders = ['github', 'gh', 'bitbucket', 'bb', 'circleci'] as const;

export let triggerPipelineRun = SlateTool.create(spec, {
  name: 'Trigger Pipeline Run',
  key: 'trigger_pipeline_run',
  description:
    'Trigger a CircleCI pipeline through the recommended API for GitHub App, GitHub OAuth, GitHub Server, Bitbucket Cloud, or Bitbucket Data Center projects. The same branch or tag is used to fetch configuration and check out code.',
  instructions: [
    'The branch and tag fields are mutually exclusive — provide one or neither.',
    'Provide pipelineDefinitionId when the project has multiple pipeline definitions or a specific definition must run.',
    'Pipeline parameters must be declared in the project configuration.'
  ],
  constraints: ['CircleCI documents this endpoint as unsupported for GitLab projects.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectSlug: z
        .string()
        .describe('Three-part project slug from Project Settings > Overview'),
      pipelineDefinitionId: z
        .string()
        .optional()
        .describe('Pipeline definition UUID from Project Settings > Pipelines'),
      branch: z.string().optional().describe('Branch used for configuration and checkout'),
      tag: z
        .string()
        .optional()
        .describe('Tag used for configuration and checkout (mutually exclusive with branch)'),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Declared pipeline parameters as key-value pairs')
    })
  )
  .output(
    z.object({
      triggered: z.boolean(),
      pipelineId: z.string().optional(),
      pipelineNumber: z.number().optional(),
      state: z.string().optional(),
      createdAt: z.string().optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.branch && ctx.input.tag) {
      throw circleCiValidationError('Provide either branch or tag, not both.');
    }
    validatePipelineParameters(ctx.input.parameters);

    let [provider, organization, project, ...extra] = ctx.input.projectSlug.split('/');
    if (
      !provider ||
      !organization ||
      !project ||
      extra.length > 0 ||
      !supportedProviders.includes(provider as (typeof supportedProviders)[number])
    ) {
      throw circleCiValidationError(
        'projectSlug must contain exactly provider/organization/project and use a supported provider prefix.'
      );
    }

    let result = await new Client({ token: ctx.auth.token }).triggerPipelineRun(
      { provider, organization, name: project },
      {
        definitionId: ctx.input.pipelineDefinitionId,
        branch: ctx.input.branch,
        tag: ctx.input.tag,
        parameters: ctx.input.parameters
      }
    );
    let triggered = typeof result.id === 'string';

    return {
      output: {
        triggered,
        pipelineId: result.id,
        pipelineNumber: result.number,
        state: result.state,
        createdAt: result.created_at,
        message: result.message
      },
      message: triggered
        ? `Pipeline **#${result.number}** triggered successfully on project \`${ctx.input.projectSlug}\` (state: ${result.state}).`
        : result.message || 'CircleCI accepted the request but did not trigger a pipeline.'
    };
  })
  .build();
