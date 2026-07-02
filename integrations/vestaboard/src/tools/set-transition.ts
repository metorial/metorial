import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudClient } from '../lib/client';
import { spec } from '../spec';

export let setTransition = SlateTool.create(spec, {
  name: 'Set Transition Effect',
  key: 'set_transition',
  description: `Configure the transition animation that plays when the Vestaboard changes between messages. Choose a transition type and speed.

Only available via the **Cloud API** for Flagship and Vestaboard Note devices (not Note Arrays).`,
  constraints: [
    'Only supported by the Cloud API.',
    'Not available for Note Array configurations.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      transition: z
        .enum(['classic', 'wave', 'drift', 'curtain'])
        .describe('The transition animation type.'),
      transitionSpeed: z
        .enum(['gentle', 'fast'])
        .describe('The speed of the transition animation.')
    })
  )
  .output(
    z.object({
      transition: z
        .enum(['classic', 'wave', 'drift', 'curtain'])
        .describe('The active transition type.'),
      transitionSpeed: z.enum(['gentle', 'fast']).describe('The active transition speed.')
    })
  )
  .handleInvocation(async ctx => {
    let { apiType } = ctx.auth;

    if (apiType !== 'cloud') {
      throw new Error('Transition effects are only available via the Cloud API.');
    }

    let client = new CloudClient(ctx.auth.token);
    let result = await client.setTransition({
      transition: ctx.input.transition,
      transitionSpeed: ctx.input.transitionSpeed
    });

    return {
      output: result,
      message: `Transition set to **${result.transition}** at **${result.transitionSpeed}** speed.`
    };
  })
  .build();
