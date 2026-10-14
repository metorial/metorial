import { createApiServiceError } from 'slates';
import { z } from 'zod';

let providerStateSchema = z.object({
  scope: z.string(),
  key: z.string(),
  settings: z.record(z.string(), z.unknown()),
  enable_inline_cli: z.boolean().optional(),
  enable_user_states: z.boolean().optional(),
  gui_only: z.boolean().optional()
});

export let stateOutputSchema = z.object({
  scope: z.string().describe('State scope, such as app or user'),
  key: z.string().describe('Application or API key name associated with the state'),
  settings: z
    .record(z.string(), z.unknown())
    .describe('Effective saved model and feature settings'),
  enableInlineCli: z
    .boolean()
    .optional()
    .describe('Whether prompt commands can change settings'),
  enableUserStates: z
    .boolean()
    .optional()
    .describe('Whether state is isolated by end-user identifier'),
  guiOnly: z.boolean().optional().describe('Whether updates are restricted to the dashboard'),
  rawResponse: z.unknown().describe('Complete provider state response')
});

export let mapStateResponse = (response: unknown) => {
  let parsed = providerStateSchema.safeParse(response);
  if (!parsed.success) {
    throw createApiServiceError('APIpie AI returned an invalid saved state response.');
  }
  let state = parsed.data;
  return {
    scope: state.scope,
    key: state.key,
    settings: state.settings,
    enableInlineCli: state.enable_inline_cli,
    enableUserStates: state.enable_user_states,
    guiOnly: state.gui_only,
    rawResponse: response
  };
};
