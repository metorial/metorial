import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let flagChange = SlateTrigger.create(spec, {
  name: 'Feature Flag Changed',
  key: 'flag_change',
  description:
    'Triggers when a feature flag definition is modified in any environment. Receives audit log webhook payloads from Split. Configure the "Outgoing webhook (Audit log)" integration in Split UI to point to this trigger\'s URL.'
})
  .input(
    z.object({
      flagName: z.string().describe('Name of the feature flag that was changed.'),
      changeDescription: z.string().describe('Human-readable description of the change.'),
      environmentName: z.string().describe('Environment where the change occurred.'),
      editorEmail: z.string().describe('Email or identity of who made the change.'),
      changeNumber: z
        .number()
        .describe('Version number of the flag definition after the change.'),
      timestamp: z.number().describe('Unix timestamp of the change.'),
      definition: z.string().describe('Flag definition after the change (JSON string).'),
      link: z.string().nullable().optional().describe('URL link to the flag in Split UI.'),
      schemaVersion: z.number().optional().describe('Webhook schema version.')
    })
  )
  .output(
    z.object({
      flagName: z.string().describe('Name of the modified feature flag.'),
      changeDescription: z.string().describe('What changed.'),
      environmentName: z.string().describe('Environment affected.'),
      editorEmail: z.string().describe('Who made the change.'),
      changeNumber: z.number().describe('New version number.'),
      timestamp: z.number().describe('When the change happened (Unix timestamp).'),
      link: z.string().nullable().optional().describe('Link to the flag in the Split UI.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Split audit log webhook sends a single object per flag change
      return {
        inputs: [
          {
            flagName: body.name ?? '',
            changeDescription: body.description ?? '',
            environmentName: body.environmentName ?? '',
            editorEmail: body.editor ?? '',
            changeNumber: body.changeNumber ?? 0,
            timestamp: body.time ?? 0,
            definition:
              typeof body.definition === 'string'
                ? body.definition
                : JSON.stringify(body.definition ?? ''),
            link: body.link ?? null,
            schemaVersion: body.schemaVersion
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'feature_flag.changed',
        id: `${ctx.input.flagName}-${ctx.input.changeNumber}-${ctx.input.timestamp}`,
        output: {
          flagName: ctx.input.flagName,
          changeDescription: ctx.input.changeDescription,
          environmentName: ctx.input.environmentName,
          editorEmail: ctx.input.editorEmail,
          changeNumber: ctx.input.changeNumber,
          timestamp: ctx.input.timestamp,
          link: ctx.input.link
        }
      };
    }
  })
  .build();
