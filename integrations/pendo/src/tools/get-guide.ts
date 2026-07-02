import { SlateTool } from 'slates';
import { z } from 'zod';
import { PendoClient } from '../lib/client';
import { spec } from '../spec';

export let getGuide = SlateTool.create(spec, {
  name: 'Get Guide',
  key: 'get_guide',
  description: `Retrieve a specific guide from Pendo by ID. Returns full guide configuration including steps, targeting rules, launch method, and deployment status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      guideId: z.string().describe('The guide ID to retrieve')
    })
  )
  .output(
    z.object({
      guideId: z.string().describe('Guide ID'),
      name: z.string().describe('Guide name'),
      state: z.string().optional().describe('Guide state (draft, staged, public, disabled)'),
      launchMethod: z.string().optional().describe('How the guide is launched'),
      steps: z
        .array(
          z.object({
            stepId: z.string().optional().describe('Step ID'),
            type: z.string().optional().describe('Step type'),
            content: z.string().optional().describe('Step content or DOM selector')
          })
        )
        .optional()
        .describe('Guide steps'),
      segment: z.any().optional().describe('Targeting segment for the guide'),
      raw: z.any().describe('Full raw guide record from Pendo')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PendoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let guide = await client.getGuide(ctx.input.guideId);

    let steps = (guide.steps || []).map((s: any) => ({
      stepId: s.id,
      type: s.type,
      content: s.content || s.domSelector
    }));

    return {
      output: {
        guideId: guide.id || ctx.input.guideId,
        name: guide.name || '',
        state: guide.state,
        launchMethod: guide.launchMethod,
        steps,
        segment: guide.audienceUiHint || guide.segment,
        raw: guide
      },
      message: `Retrieved guide **${guide.name || ctx.input.guideId}** (state: ${guide.state || 'unknown'}).`
    };
  })
  .build();
