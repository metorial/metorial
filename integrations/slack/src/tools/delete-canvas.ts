import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let deleteCanvas = SlateTool.create(spec, {
  name: 'Delete Canvas',
  key: 'delete_canvas',
  description:
    'Permanently delete one Slack Canvas by its explicit ID. This action is destructive and irreversible.',
  instructions: [
    'Use only when the user explicitly intends to permanently delete the identified Canvas.',
    'Set confirmDeletion to true only after confirming that the exact canvasId should be deleted.'
  ],
  constraints: [
    'Canvas deletion is irreversible. The Canvas and its content cannot be recovered by this tool.',
    'This tool requires both an explicit canvasId and confirmDeletion=true.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(slackActionScopes.canvasesWrite)
  .input(
    z.object({
      canvasId: z
        .string()
        .trim()
        .min(1)
        .describe('Exact Slack Canvas ID to delete permanently'),
      confirmDeletion: z
        .literal(true)
        .describe('Explicit confirmation that this Canvas should be permanently deleted')
    })
  )
  .output(
    z.object({
      canvasId: z.string().describe('Permanently deleted Slack Canvas ID'),
      deleted: z.literal(true).describe('Whether Slack accepted the permanent deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    await client.deleteCanvas(ctx.input.canvasId);

    return {
      output: {
        canvasId: ctx.input.canvasId,
        deleted: true as const
      },
      message: `Permanently deleted Slack Canvas \`${ctx.input.canvasId}\`. This action is irreversible.`
    };
  })
  .build();
