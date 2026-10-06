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
        .describe('The unique identifier of the running sandbox to snapshot.'),
      name: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Optional snapshot name. Reusing a name creates a new build for that snapshot template.'
        )
    })
  )
  .output(
    z.object({
      snapshotId: z
        .string()
        .describe(
          'Snapshot template identifier including its tag. Pass this as templateId to create_sandbox.'
        ),
      names: z
        .array(z.string())
        .describe('Names of the snapshot template including namespace and tag.'),
      sandboxId: z.string().describe('ID of the sandbox the snapshot was created from.'),
      templateId: z
        .string()
        .describe(
          'Legacy field, empty because E2B does not return a separate template ID. Use snapshotId to create a sandbox.'
        ),
      createdAt: z
        .string()
        .describe('Legacy field, empty because E2B does not return a creation timestamp.'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata associated with the snapshot.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Creating snapshot...');
    let snapshot = await client.createSnapshot(ctx.input.sandboxId, ctx.input.name);

    return {
      output: snapshot,
      message: `Created snapshot **${snapshot.snapshotId}** from sandbox \`${snapshot.sandboxId}\`.`
    };
  })
  .build();
