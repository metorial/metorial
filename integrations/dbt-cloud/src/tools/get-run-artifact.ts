import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let getRunArtifactTool = SlateTool.create(spec, {
  name: 'Get Run Artifact',
  key: 'get_run_artifact',
  description: `Fetch an artifact file from a completed dbt Cloud run as a Slate attachment. Supports retrieving \`manifest.json\`, \`run_results.json\`, and \`catalog.json\`. These artifacts contain model metadata, execution timing, test results, and catalog information. Optionally target a specific run step.`,
  instructions: [
    'Common artifact paths: "manifest.json", "run_results.json", "catalog.json".',
    'Use the step parameter to get artifacts from a specific step (1-indexed). Defaults to the last step.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      runId: z.string().describe('The unique ID of the completed run'),
      path: z
        .string()
        .describe(
          'Artifact file path (e.g., "manifest.json", "run_results.json", "catalog.json")'
        ),
      step: z
        .number()
        .optional()
        .describe(
          'Step index (1-based) to retrieve artifacts from. Defaults to the latest step.'
        )
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Run the artifact was downloaded from'),
      path: z.string().describe('Artifact file path'),
      contentType: z.string().describe('Artifact MIME type'),
      sizeBytes: z.number().describe('Artifact size in bytes'),
      attachmentCount: z.number().describe('Number of returned attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let artifact = await client.getRunArtifact(
      ctx.input.runId,
      ctx.input.path,
      ctx.input.step
    );

    return {
      output: {
        runId: ctx.input.runId,
        path: ctx.input.path,
        contentType: artifact.contentType,
        sizeBytes: artifact.sizeBytes,
        attachmentCount: 1
      },
      attachments: [createTextAttachment(artifact.content, artifact.contentType)],
      message: `Retrieved artifact **${ctx.input.path}** from run #${ctx.input.runId}.`
    };
  })
  .build();
