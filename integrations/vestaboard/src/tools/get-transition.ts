import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudClient } from '../lib/client';
import { spec } from '../spec';

export let getTransition = SlateTool.create(spec, {
  name: 'Get Transition Effect',
  key: 'get_transition',
  description: `Retrieve the current transition animation configuration for a Vestaboard. Returns the transition type and speed.

Only available via the **Cloud API** for Flagship and Vestaboard Note devices (not Note Arrays).`,
  constraints: [
    'Only supported by the Cloud API.',
    'Not available for Note Array configurations.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
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
    let result = await client.getTransition();

    return {
      output: result,
      message: `Current transition: **${result.transition}** at **${result.transitionSpeed}** speed.`
    };
  })
  .build();
