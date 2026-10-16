import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getOfflinePlanState } from '../lib/client';
import { spec } from '../spec';

let inputSchema = z.object({
  expoKey: z
    .string()
    .describe('Expo key from list_events, such as demo. Use the key rather than a URL.')
});

let stateSchema = z.object({
  expoId: z.number().optional().describe('Expo identifier'),
  expoKey: z.string().optional().describe('Expo key'),
  startDate: z.string().nullish().describe('Build start time in UTC'),
  finishDate: z.string().nullish().describe('Build finish time in UTC'),
  version: z.number().optional().describe('Last successfully built archive version'),
  versionActual: z.number().optional().describe('Current floor-plan version counter'),
  fileName: z.string().nullish().describe('Versioned ZIP archive filename'),
  fileHash: z.string().nullish().describe('Archive hash'),
  fileUrl: z.string().nullish().describe('Direct ZIP archive URL'),
  jobId: z.string().nullish().describe('Background build job identifier'),
  status: z.number().describe('Build status: 0 None, 1 InProgress, 2 Completed'),
  statusStr: z.string().optional().describe('Build status name'),
  executorState: z.string().nullish().describe('Current build execution state'),
  executorProgress: z.string().nullish().describe('Latest build progress message'),
  executorErrorMessage: z.string().nullish().describe('Build failure detail, when present'),
  lockStartDate: z.string().nullish().describe('Build lock start time in UTC'),
  lockDuration: z.number().optional().describe('Build lock duration in seconds'),
  error: z.string().nullish().describe('Request-level error detail, when present'),
  retryAfter: z.number().optional().describe('Suggested seconds before checking again')
});

let outputSchema = z.object({
  state: stateSchema.nullable().describe('Latest archive state, or null if none exists')
});

let readState = async (expoKey: string, prepare: boolean) => {
  let response = await getOfflinePlanState(expoKey, prepare);
  let parsed = stateSchema.nullable().safeParse(response);
  if (!parsed.success || (prepare && parsed.data === null)) {
    throw createApiServiceError('ExpoFP returned an invalid offline archive state.', {
      reason: 'expofp_invalid_response'
    });
  }
  if (parsed.data?.error) {
    throw createApiServiceError(
      `ExpoFP could not prepare the offline archive: ${parsed.data.error}`,
      {
        reason: 'expofp_offline_error'
      }
    );
  }
  return parsed.data;
};

export let getOfflinePlan = SlateTool.create(spec, {
  name: 'Get Offline Floor Plan State',
  key: 'get_offline_plan',
  description:
    'Check the latest offline floor-plan archive without starting a build. Compare version with versionActual to see whether the archive is current. Call list_events to discover expo keys.',
  constraints: [
    'ExpoFP caches archive state for about 120 seconds. Check no faster than that.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(inputSchema)
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let state = await readState(ctx.input.expoKey, false);
    return {
      output: { state },
      message: state
        ? `Retrieved offline archive state for **${ctx.input.expoKey}**.`
        : `No offline archive exists yet for **${ctx.input.expoKey}**. Use prepare_offline_plan to start one.`
    };
  })
  .build();

export let prepareOfflinePlan = SlateTool.create(spec, {
  name: 'Prepare Offline Floor Plan',
  key: 'prepare_offline_plan',
  description:
    'Prepare a versioned ZIP archive of an event floor plan for offline use. Starts a build when needed and returns its current state. A completed archive matching the current version is provided as a downloadable file. Call list_events to discover expo keys.',
  constraints: [
    'A new build can take several minutes. If it is still building, wait about 120 seconds before calling again.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(inputSchema)
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let state = await readState(ctx.input.expoKey, true);
    let current =
      state?.status === 2 &&
      typeof state.version === 'number' &&
      state.version === state.versionActual;

    if (current && state) {
      let url: URL;
      try {
        url = new URL(state.fileUrl ?? '');
      } catch {
        throw createApiServiceError(
          'ExpoFP completed the archive without a valid download URL.'
        );
      }
      if (url.protocol !== 'https:' || url.username || url.password) {
        throw createApiServiceError('ExpoFP returned an invalid archive download URL.');
      }
      await ctx.addAttachment({ type: 'url', url, mimeType: 'application/zip' });
    }

    return {
      output: { state },
      message: current
        ? `The offline floor plan for **${ctx.input.expoKey}** is ready to download.`
        : `The offline archive for **${ctx.input.expoKey}** is being prepared. Check again after about ${state?.retryAfter ?? 120} seconds.`
    };
  })
  .build();
