import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { googleCloudSpeechActionScopes } from '../scopes';
import { spec } from '../spec';

export let getOperation = SlateTool.create(spec, {
  name: 'Get Operation',
  key: 'get_operation',
  description: `Check the status and retrieve results of a long-running Speech-to-Text operation. Use this to monitor batch transcription jobs started with the Batch Transcribe Audio tool.

Returns the current status, and when complete, the full transcription results or error details.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleCloudSpeechActionScopes.getOperation)
  .input(
    z.object({
      operationName: z
        .string()
        .describe(
          'Full operation resource name (e.g. "projects/my-project/locations/us-central1/operations/12345").'
        )
    })
  )
  .output(
    z.object({
      operationName: z.string().describe('Operation resource name.'),
      done: z.boolean().describe('Whether the operation has completed.'),
      error: z
        .object({
          code: z.number().optional(),
          message: z.string().optional()
        })
        .optional()
        .describe('Error details if the operation failed.'),
      response: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Operation result when complete. For batch transcription, contains transcription results keyed by file URI.'
        ),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Operation metadata with progress information.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.config.region
    });

    let response = await client.getOperation(ctx.input.operationName);

    let statusMessage = response.done
      ? response.error
        ? `Operation **failed**: ${response.error.message}`
        : 'Operation **completed** successfully.'
      : 'Operation is still **in progress**.';

    return {
      output: {
        operationName: response.name || ctx.input.operationName,
        done: response.done || false,
        error: response.error
          ? { code: response.error.code, message: response.error.message }
          : undefined,
        response: response.response,
        metadata: response.metadata
      },
      message: statusMessage
    };
  })
  .build();
