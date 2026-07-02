import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let setUserSummaryInstructions = SlateTool.create(spec, {
  name: 'Set User Summary Instructions',
  key: 'set_user_summary_instructions',
  description: `Configure custom instructions for how Zep generates summaries of user data in their knowledge graph. Use this to tailor summaries to emphasize information most relevant to your application.`,
  instructions: [
    'Leave userIds empty to set project-wide default instructions.',
    'Provide specific userIds to customize instructions for individual users.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      instructions: z
        .array(
          z.object({
            name: z.string().describe('Name/identifier for the instruction'),
            text: z
              .string()
              .describe('The instruction text describing how summaries should be generated')
          })
        )
        .min(1)
        .describe('List of summary generation instructions'),
      userIds: z
        .array(z.string())
        .optional()
        .describe('Specific user IDs to apply instructions to (empty applies project-wide)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the instructions were set successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    await client.setUserSummaryInstructions({
      instructions: ctx.input.instructions,
      userIds: ctx.input.userIds
    });
    let target = ctx.input.userIds?.length
      ? `${ctx.input.userIds.length} user(s)`
      : 'project-wide default';
    return {
      output: { success: true },
      message: `Set **${ctx.input.instructions.length}** summary instruction(s) for ${target}.`
    };
  })
  .build();
