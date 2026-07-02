import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { neonValidationError } from '../lib/errors';
import { spec } from '../spec';

export let restoreBranch = SlateTool.create(spec, {
  name: 'Restore Branch',
  key: 'restore_branch',
  description: `Restores a branch to a previous state using a point-in-time timestamp or LSN. Optionally preserves the current state under a new branch name before restoring.`,
  instructions: [
    'Provide either sourceTimestamp or sourceLsn to specify the restore point.',
    'Use preserveUnderName to save the current branch state before restoring.'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project containing the branch'),
      branchId: z.string().describe('ID of the branch to restore'),
      sourceTimestamp: z.string().optional().describe('ISO 8601 timestamp to restore to'),
      sourceLsn: z.string().optional().describe('Log Sequence Number to restore to'),
      preserveUnderName: z
        .string()
        .optional()
        .describe('Name to preserve the current branch state under before restoring')
    })
  )
  .output(
    z.object({
      branchId: z.string().describe('ID of the restored branch'),
      name: z.string().describe('Name of the restored branch')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.sourceTimestamp && ctx.input.sourceLsn) {
      throw neonValidationError(
        'Provide either sourceTimestamp or sourceLsn when restoring a branch, not both.'
      );
    }

    let client = new NeonClient({ token: ctx.auth.token });

    let result = await client.restoreBranch(ctx.input.projectId, ctx.input.branchId, {
      sourceTimestamp: ctx.input.sourceTimestamp,
      sourceLsn: ctx.input.sourceLsn,
      preserveUnderName: ctx.input.preserveUnderName
    });

    let b = result.branch;

    return {
      output: {
        branchId: b.id,
        name: b.name
      },
      message: `Restored branch **${b.name}** (${b.id})${ctx.input.preserveUnderName ? `. Previous state preserved as "${ctx.input.preserveUnderName}"` : ''}.`
    };
  })
  .build();
