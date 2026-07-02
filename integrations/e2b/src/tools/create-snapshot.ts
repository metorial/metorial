import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let createSnapshot = SlateTool.create(spec, {
  name: 'Create Snapshot',
  key: 'create_snapshot',
  description: `Create a persistent snapshot of a running sandbox's state. The sandbox is briefly paused during snapshot creation and then automatically resumes. Snapshots allow rapidly spinning up new sandboxes from a known state.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sandboxId: z
        .string()
        .describe('The unique identifier of the running sandbox to snapshot.')
    })
  )
  .output(
    z.object({
      snapshotId: z.string().describe('Unique identifier of the created snapshot.'),
      sandboxId: z.string().describe('ID of the sandbox the snapshot was created from.'),
      templateId: z.string().describe('Template ID associated with the snapshot.'),
      createdAt: z.string().describe('ISO 8601 timestamp when the snapshot was created.'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata associated with the snapshot.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Creating snapshot...');
    let snapshot = await client.createSnapshot(ctx.input.sandboxId);

    return {
      output: snapshot,
      message: `Created snapshot **${snapshot.snapshotId}** from sandbox \`${snapshot.sandboxId}\`.`
    };
  })
  .build();
