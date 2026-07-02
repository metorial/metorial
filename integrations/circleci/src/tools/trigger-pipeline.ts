import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerPipeline = SlateTool.create(spec, {
  name: 'Trigger Pipeline',
  key: 'trigger_pipeline',
  description: `Trigger a new CI/CD pipeline for a project. You can specify a branch or tag to build, and pass custom pipeline parameters to control which workflows run and how they behave.
The project slug format is \`vcs-slug/org-name/repo-name\` (e.g., \`gh/my-org/my-repo\` or \`github/my-org/my-repo\`).`,
  instructions: [
    'The branch and tag fields are mutually exclusive — provide one or neither.',
    'Pipeline parameters must be declared in the project .circleci/config.yml under a top-level parameters key.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectSlug: z
        .string()
        .describe(
          'Project slug in the format vcs-slug/org-name/repo-name (e.g., gh/my-org/my-repo)'
        ),
      branch: z.string().optional().describe('Branch to trigger the pipeline on'),
      tag: z
        .string()
        .optional()
        .describe('Tag to trigger the pipeline on (mutually exclusive with branch)'),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom pipeline parameters as key-value pairs')
    })
  )
  .output(
    z.object({
      pipelineId: z.string().describe('ID of the triggered pipeline'),
      pipelineNumber: z.number().describe('Number of the triggered pipeline'),
      state: z.string().describe('Current state of the pipeline'),
      createdAt: z.string().describe('Timestamp when the pipeline was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: { branch?: string; tag?: string; parameters?: Record<string, any> } = {};
    if (ctx.input.branch) params.branch = ctx.input.branch;
    if (ctx.input.tag) params.tag = ctx.input.tag;
    if (ctx.input.parameters) params.parameters = ctx.input.parameters;

    let result = await client.triggerPipeline(ctx.input.projectSlug, params);

    return {
      output: {
        pipelineId: result.id,
        pipelineNumber: result.number,
        state: result.state,
        createdAt: result.created_at
      },
      message: `Pipeline **#${result.number}** triggered successfully on project \`${ctx.input.projectSlug}\` (state: ${result.state}).`
    };
  })
  .build();
