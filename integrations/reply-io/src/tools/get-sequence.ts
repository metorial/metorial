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
      contactsTop: z
        .number()
        .optional()
        .describe('Maximum contacts in the included page (1–100).'),
      contactsSkip: z
        .number()
        .optional()
        .describe('Contacts to skip when including contacts.'),
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
      contactsHasMore: z.boolean().optional(),
      contacts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Contacts in the sequence, if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let sequence = await client.getSequence(ctx.input.sequenceId);

    let steps: Record<string, any>[] | undefined;
    let contacts: Record<string, any>[] | undefined;
    let contactsHasMore: boolean | undefined;

    if (ctx.input.includeSteps) {
      let stepsResult = await client.listSequenceSteps(ctx.input.sequenceId);
      steps = stepsResult;
    }

    if (ctx.input.includeContacts) {
      let contactsResult = await client.listSequenceContacts(ctx.input.sequenceId, {
        additionalColumns: 'CurrentStep,LastStepCompletedAt,Status',
        top: ctx.input.contactsTop,
        skip: ctx.input.contactsSkip
      });
      contacts = contactsResult.items;
      contactsHasMore = contactsResult.hasMore;
    }

    return {
      output: {
        sequence,
        steps,
        contacts,
        contactsHasMore
      },
      message: `Retrieved sequence **${sequence.name ?? ctx.input.sequenceId}**.${steps ? ` Has **${steps.length}** step(s).` : ''}${contacts ? ` Has **${contacts.length}** contact(s).` : ''}`
    };
  })
  .build();
