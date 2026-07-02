import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIngestionStatus = SlateTool.create(spec, {
  name: 'Get Ingestion Status',
  key: 'get_ingestion_status',
  description: `Get the current data ingestion status for the LogDNA instance. Returns whether ingestion is active or suspended.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('Current ingestion status (e.g., "active" or "suspended")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let result = await client.getIngestionStatus();

    return {
      output: {
        status: result?.status || JSON.stringify(result)
      },
      message: `Ingestion status: **${result?.status || 'unknown'}**.`
    };
  })
  .build();

export let suspendIngestion = SlateTool.create(spec, {
  name: 'Suspend Ingestion',
  key: 'suspend_ingestion',
  description: `Suspend data ingestion for the LogDNA instance. This is a two-step process: the first call returns a confirmation token, and the second call (with confirm=true) actually suspends ingestion. This prevents accidental suspension.`,
  instructions: [
    'First call without "confirm" to get a suspend token.',
    'Then call again with confirm=true and the suspendToken from the first call to complete suspension.'
  ],
  constraints: ['Requires two API calls to prevent accidental suspension.'],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      confirm: z
        .boolean()
        .optional()
        .describe('Set to true to confirm suspension (second step)'),
      suspendToken: z
        .string()
        .optional()
        .describe('Token received from the initial suspend call, required when confirm=true')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Result status or suspend token'),
      suspendToken: z.string().optional().describe('Token to use in the confirmation step')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });

    if (ctx.input.confirm && ctx.input.suspendToken) {
      let result = await client.confirmSuspendIngestion(ctx.input.suspendToken);
      return {
        output: {
          status: result?.status || 'suspended'
        },
        message: 'Ingestion has been **suspended**.'
      };
    }

    let result = await client.suspendIngestion();
    return {
      output: {
        status: 'pending_confirmation',
        suspendToken: result?.token || result?.suspend_token || JSON.stringify(result)
      },
      message:
        'Suspend initiated. Use the returned **suspendToken** with `confirm=true` to complete the suspension.'
    };
  })
  .build();

export let resumeIngestion = SlateTool.create(spec, {
  name: 'Resume Ingestion',
  key: 'resume_ingestion',
  description: `Resume data ingestion for the LogDNA instance after it has been suspended.`,
  tags: { destructive: false, readOnly: false }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('Result status after resuming ingestion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let result = await client.resumeIngestion();

    return {
      output: {
        status: result?.status || 'active'
      },
      message: 'Ingestion has been **resumed**.'
    };
  })
  .build();
