import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subtitleActions = SlateTool.create(spec, {
  name: 'Subtitle Actions',
  key: 'subtitle_actions',
  description: `List available workflow actions or perform a workflow action on subtitles. Actions include save-draft, publish, approve, reject, etc. Available actions depend on team configuration and current subtitle state.`,
  instructions: [
    'Omit "action" to list all currently available actions for the subtitle set.',
    'Provide "action" to perform that specific workflow action.'
  ]
})
  .input(
    z.object({
      videoId: z.string().describe('The video identifier'),
      languageCode: z.string().describe('Language code (BCP-47)'),
      action: z
        .string()
        .optional()
        .describe(
          'Action to perform (e.g. "save-draft", "publish", "approve", "reject"). Omit to list available actions.'
        )
    })
  )
  .output(
    z.object({
      performed: z.boolean().describe('Whether an action was performed'),
      performedAction: z.string().optional().describe('The action that was performed'),
      availableActions: z
        .array(
          z.object({
            action: z.string().describe('Action identifier'),
            label: z.string().describe('Human-readable label'),
            complete: z
              .boolean()
              .nullable()
              .describe('Whether this action marks subtitles as complete')
          })
        )
        .optional()
        .describe('Available actions (when listing)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    if (ctx.input.action) {
      await client.performSubtitleAction(
        ctx.input.videoId,
        ctx.input.languageCode,
        ctx.input.action
      );
      return {
        output: {
          performed: true,
          performedAction: ctx.input.action
        },
        message: `Performed action **"${ctx.input.action}"** on subtitles for \`${ctx.input.languageCode}\` on video \`${ctx.input.videoId}\`.`
      };
    }

    let actions = await client.listSubtitleActions(ctx.input.videoId, ctx.input.languageCode);
    return {
      output: {
        performed: false,
        availableActions: actions.map(a => ({
          action: a.action,
          label: a.label,
          complete: a.complete
        }))
      },
      message: `Found **${actions.length}** available action(s) for \`${ctx.input.languageCode}\` subtitles: ${actions.map(a => `"${a.action}"`).join(', ') || 'none'}.`
    };
  })
  .build();
