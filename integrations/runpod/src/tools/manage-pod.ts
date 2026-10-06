import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let managePod = SlateTool.create(spec, {
  name: 'Manage Pod',
  key: 'manage_pod',
  description: `Perform lifecycle actions on a Pod: start, stop, restart, or terminate. Use this to control the state of a running or stopped Pod.`,
  instructions: [
    'Pods with a network volume attached cannot be stopped, only terminated.',
    'The reset action is retained for compatibility but is no longer supported by Runpod; use restart or recreate the Pod.',
    'Terminating a Pod permanently deletes it.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      podId: z.string().describe('ID of the Pod to manage'),
      action: z
        .enum(['start', 'stop', 'restart', 'reset', 'terminate'])
        .describe(
          'Lifecycle action. reset is retained for compatibility and returns an unsupported-operation error.'
        )
    })
  )
  .output(
    z.object({
      podId: z.string().describe('ID of the affected Pod'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });
    let { podId, action } = ctx.input;

    switch (action) {
      case 'start':
        await client.startPod(podId);
        break;
      case 'stop':
        await client.stopPod(podId);
        break;
      case 'restart':
        await client.restartPod(podId);
        break;
      case 'reset':
        await client.resetPod(podId);
        break;
      case 'terminate':
        await client.deletePod(podId);
        break;
    }

    return {
      output: {
        podId,
        action,
        success: true
      },
      message: `Successfully **${action === 'terminate' ? 'terminated' : `${action}ed`}** Pod **${podId}**.`
    };
  })
  .build();
