import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSequence = SlateTool.create(spec, {
  name: 'Get Sequence',
  key: 'get_sequence',
  description: `Retrieve detailed information about a specific outreach sequence, including its configuration, steps, and status. Optionally fetch the sequence's steps and contacts in a single call.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sequenceId: z.number().describe('ID of the sequence to retrieve'),
      includeSteps: z.boolean().optional().describe('Also fetch the sequence steps'),
      includeContacts: z
        .boolean()
        .optional()
        .describe('Also fetch the contacts in this sequence')
    })
  )
  .output(
    z.object({
      sequence: z.record(z.string(), z.any()).describe('Sequence details'),
      steps: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Sequence steps, if requested'),
      contacts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Contacts in the sequence, if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let sequence = await client.getSequence(ctx.input.sequenceId);

    let steps: Record<string, any>[] | undefined;
    let contacts: Record<string, any>[] | undefined;

    if (ctx.input.includeSteps) {
      let stepsResult = await client.listSequenceSteps(ctx.input.sequenceId);
      steps = Array.isArray(stepsResult) ? stepsResult : (stepsResult?.items ?? []);
    }

    if (ctx.input.includeContacts) {
      let contactsResult = await client.listSequenceContacts(ctx.input.sequenceId, {
        additionalColumns: 'CurrentStep,LastStepCompletedAt,Status'
      });
      contacts = Array.isArray(contactsResult)
        ? contactsResult
        : (contactsResult?.items ?? []);
    }

    return {
      output: {
        sequence,
        steps,
        contacts
      },
      message: `Retrieved sequence **${sequence.name ?? ctx.input.sequenceId}**.${steps ? ` Has **${steps.length}** step(s).` : ''}${contacts ? ` Has **${contacts.length}** contact(s).` : ''}`
    };
  })
  .build();
