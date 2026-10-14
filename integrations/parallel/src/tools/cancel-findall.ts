import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelFindall = SlateTool.create(spec, {
  name: 'Cancel FindAll Run',
  key: 'cancel_findall',
  description:
    'Stop an active entity discovery run to control further work and costs. Candidates already found remain available through Get FindAll Results.',
  constraints: [
    'Work already in flight may finish. Cancellation does not reverse existing charges, and cancelled runs cannot be extended.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({ findallId: z.string().describe('FindAll run ID returned by Find Entities') })
  )
  .output(
    z.object({
      findallId: z.string().describe('Cancelled FindAll run ID'),
      cancelled: z.boolean().describe('Whether the provider accepted cancellation')
    })
  )
  .handleInvocation(async ctx => {
    await new Client(ctx.auth.token).cancelFindAll(ctx.input.findallId);
    return {
      output: { findallId: ctx.input.findallId, cancelled: true },
      message: `Cancelled FindAll run **${ctx.input.findallId}**. Previously found candidates remain available.`
    };
  })
  .build();
