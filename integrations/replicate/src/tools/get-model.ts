import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getModel = SlateTool.create(spec, {
  name: 'Get Model',
  key: 'get_model',
  description: `Get details about a specific model on Replicate, including its description, latest version, run count, and input/output schema.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Model owner username'),
      modelName: z.string().describe('Model name')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Model owner'),
      modelName: z.string().describe('Model name'),
      description: z.string().optional().nullable().describe('Model description'),
      visibility: z.string().describe('public or private'),
      url: z.string().optional().describe('URL to the model page'),
      runCount: z.number().optional().describe('Total number of runs'),
      isOfficial: z.boolean().optional().describe('Whether this is an official model'),
      defaultExample: z.any().optional().nullable().describe('Default example prediction'),
      githubUrl: z.string().optional().nullable().describe('Associated GitHub repository'),
      paperUrl: z.string().optional().nullable().describe('Associated paper URL'),
      licenseUrl: z.string().optional().nullable().describe('License URL'),
      coverImageUrl: z.string().optional().nullable().describe('Cover image URL'),
      latestVersionId: z.string().optional().nullable().describe('ID of the latest version'),
      latestVersionCreatedAt: z
        .string()
        .optional()
        .nullable()
        .describe('When the latest version was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getModel(ctx.input.owner, ctx.input.modelName);

    return {
      output: {
        owner: result.owner,
        modelName: result.name,
        description: result.description,
        visibility: result.visibility,
        url: result.url,
        runCount: result.run_count,
        isOfficial: result.is_official,
        defaultExample: result.default_example,
        githubUrl: result.github_url,
        paperUrl: result.paper_url,
        licenseUrl: result.license_url,
        coverImageUrl: result.cover_image_url,
        latestVersionId: result.latest_version?.id,
        latestVersionCreatedAt: result.latest_version?.created_at
      },
      message: `Model **${result.owner}/${result.name}** — ${result.visibility}, ${result.run_count ?? 0} runs.`
    };
  })
  .build();
