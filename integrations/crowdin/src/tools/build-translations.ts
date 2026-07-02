import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let buildTranslationsTool = SlateTool.create(spec, {
  name: 'Build Translations',
  key: 'build_translations',
  description: `Build (export) project translations for download. Starts a build and returns the build status. Use the build ID to check status and download results later. Also supports listing existing builds and downloading completed builds.`,
  instructions: [
    'Building translations is an asynchronous operation. After starting a build, poll the status until it is "finished".'
  ]
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      action: z.enum(['build', 'status', 'download', 'list']).describe('Action to perform'),
      buildId: z.number().optional().describe('Build ID (required for status/download)'),
      targetLanguageIds: z
        .array(z.string())
        .optional()
        .describe('Target languages to build (all if omitted)'),
      branchId: z.number().optional().describe('Build only a specific branch'),
      skipUntranslatedStrings: z
        .boolean()
        .optional()
        .describe('Skip untranslated strings in the build'),
      skipUntranslatedFiles: z
        .boolean()
        .optional()
        .describe('Skip files with no translations'),
      exportApprovedOnly: z.boolean().optional().describe('Only export approved translations'),
      limit: z.number().optional().describe('Limit for list action'),
      offset: z.number().optional().describe('Offset for list action')
    })
  )
  .output(
    z.object({
      buildId: z.number().optional().describe('Build ID'),
      status: z.string().optional().describe('Build status'),
      progress: z.number().optional().describe('Build progress percentage'),
      downloadUrl: z.string().optional().describe('URL to download the built translations'),
      builds: z
        .array(
          z.object({
            buildId: z.number(),
            status: z.string(),
            progress: z.number(),
            createdAt: z.string()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { projectId, action } = ctx.input;

    if (action === 'build') {
      let build = await client.buildTranslations(projectId, {
        branchId: ctx.input.branchId,
        targetLanguageIds: ctx.input.targetLanguageIds,
        skipUntranslatedStrings: ctx.input.skipUntranslatedStrings,
        skipUntranslatedFiles: ctx.input.skipUntranslatedFiles,
        exportApprovedOnly: ctx.input.exportApprovedOnly
      });

      return {
        output: {
          buildId: build.id,
          status: build.status,
          progress: build.progress
        },
        message: `Started build **${build.id}** (status: ${build.status}, progress: ${build.progress}%).`
      };
    }

    if (action === 'status') {
      if (!ctx.input.buildId) throw new Error('buildId is required for status');

      let build = await client.getBuildStatus(projectId, ctx.input.buildId);

      return {
        output: {
          buildId: build.id,
          status: build.status,
          progress: build.progress
        },
        message: `Build **${build.id}** status: ${build.status} (${build.progress}%).`
      };
    }

    if (action === 'download') {
      if (!ctx.input.buildId) throw new Error('buildId is required for download');

      let download = await client.downloadBuild(projectId, ctx.input.buildId);

      return {
        output: {
          buildId: ctx.input.buildId,
          downloadUrl: download.url
        },
        message: `Build **${ctx.input.buildId}** download URL is ready.`
      };
    }

    if (action === 'list') {
      let result = await client.listBuilds(projectId, {
        branchId: ctx.input.branchId,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let builds = result.data.map((item: any) => ({
        buildId: item.data.id,
        status: item.data.status,
        progress: item.data.progress,
        createdAt: item.data.createdAt
      }));

      return {
        output: { builds },
        message: `Found **${builds.length}** builds.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
