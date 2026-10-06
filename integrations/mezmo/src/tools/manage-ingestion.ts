import { SlateTool } from 'slates';
import { z } from 'zod';
import { MezmoClient } from '../lib/client';
import { spec } from '../spec';

export let getIngestionStatus = SlateTool.create(spec, {
  name: 'Get Ingestion Status',
  key: 'get_ingestion_status',
  description: `Check the current ingestion status for your Mezmo account. Returns whether ingestion is currently active or suspended.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      isIngesting: z.boolean().describe('Whether Mezmo is currently ingesting logs'),
      status: z.string().describe('Current ingestion status (e.g., "active", "suspended")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    let result = await client.getIngestionStatus();

    return {
      output: {
        status: result.isIngesting ? 'active' : 'suspended',
        isIngesting: result.isIngesting
      },
      message: `Ingestion status: **${result.isIngesting ? 'active' : 'suspended'}**.`
    };
  })
  .build();

export let suspendIngestion = SlateTool.create(spec, {
  name: 'Suspend Ingestion',
  key: 'suspend_ingestion',
  description: `Suspend all log ingestion for the account. This is a two-step process: initiating suspension and then confirming it. This tool handles both steps automatically to fully suspend ingestion.`,
  instructions: [
    'This will stop ALL log ingestion for the account.',
    'Use "Resume Ingestion" to start ingesting logs again.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      confirm: z.boolean().describe('Must be true to confirm suspension of ingestion')
    })
  )
  .output(
    z.object({
      suspended: z.boolean().describe('Whether ingestion was successfully suspended')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.confirm) {
      return {
        output: { suspended: false },
        message: 'Suspension was not confirmed. Set "confirm" to true to suspend ingestion.'
      };
    }

    let client = new MezmoClient({ token: ctx.auth.token });

    let suspendResult = await client.suspendIngestion();
    await client.confirmSuspendIngestion(suspendResult.token);

    return {
      output: { suspended: !(await client.getIngestionStatus()).isIngesting },
      message: 'Mezmo accepted the suspension. The output reports the current ingestion state.'
    };
  })
  .build();

export let resumeIngestion = SlateTool.create(spec, {
  name: 'Resume Ingestion',
  key: 'resume_ingestion',
  description: `Resume log ingestion after it has been suspended. Logs will begin being ingested again immediately.`,
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({}))
  .output(
    z.object({
      resumed: z.boolean().describe('Whether ingestion was successfully resumed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    await client.resumeIngestion();

    return {
      output: { resumed: (await client.getIngestionStatus()).isIngesting },
      message:
        'Mezmo accepted the resume request. The output reports the current ingestion state.'
    };
  })
  .build();
