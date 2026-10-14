import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { mapStateResponse, stateOutputSchema } from '../lib/state';
import { spec } from '../spec';

export let updateState = SlateTool.create(spec, {
  name: 'Update Saved State',
  key: 'update_state',
  description:
    'Update saved application settings, remove individual setting keys, or control prompt commands and user-scoped state.',
  instructions: [
    'Call get_state first to inspect the effective settings.',
    'Only supplied settings are changed. Setting enableUserStates switches scope and clears existing configurations.',
    'Setting guiOnly to true restricts later updates to the APIpie dashboard.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      settings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Partial saved settings, such as model, routing, memory, search_lang, and search_geo'
        ),
      deleteKeys: z
        .array(z.string())
        .optional()
        .describe('Names of individual saved settings to remove'),
      enableInlineCli: z
        .boolean()
        .optional()
        .describe('Allow prompt commands to change saved settings'),
      enableUserStates: z
        .boolean()
        .optional()
        .describe('Enable user-scoped state; switching scope clears existing configurations'),
      guiOnly: z
        .boolean()
        .optional()
        .describe('Restrict future setting changes to the dashboard')
    })
  )
  .output(stateOutputSchema)
  .handleInvocation(async ctx => {
    if (
      !Object.keys(ctx.input.settings ?? {}).length &&
      !ctx.input.deleteKeys?.length &&
      ctx.input.enableInlineCli === undefined &&
      ctx.input.enableUserStates === undefined &&
      ctx.input.guiOnly === undefined
    ) {
      throw createApiServiceError(
        'Provide at least one saved setting, setting key to delete, or feature flag to update.'
      );
    }
    let output = mapStateResponse(await createClient(ctx).updateState(ctx.input));
    return { output, message: `Updated saved settings for **${output.key}**.` };
  })
  .build();
