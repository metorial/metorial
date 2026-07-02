import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchSequences = SlateTool.create(spec, {
  name: 'Search Sequences',
  key: 'search_sequences',
  description: `Search for email sequences in your Apollo account. Returns sequence names, step counts, and activity status. Use this to find a sequence before adding contacts to it.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keywords: z.string().optional().describe('Keywords to search sequences by name'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25)')
    })
  )
  .output(
    z.object({
      sequences: z.array(
        z.object({
          sequenceId: z.string().optional(),
          name: z.string().optional(),
          active: z.boolean().optional(),
          numSteps: z.number().optional(),
          userId: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      totalEntries: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.searchSequences({
      qKeywords: ctx.input.keywords,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let sequences = result.sequences.map(s => ({
      sequenceId: s.id,
      name: s.name,
      active: s.active,
      numSteps: s.num_steps,
      userId: s.user_id,
      createdAt: s.created_at
    }));

    return {
      output: {
        sequences,
        totalEntries: result.pagination?.total_entries,
        currentPage: result.pagination?.page,
        totalPages: result.pagination?.total_pages
      },
      message: `Found **${result.pagination?.total_entries ?? sequences.length}** sequences. Returned ${sequences.length} results.`
    };
  })
  .build();

export let addContactsToSequence = SlateTool.create(spec, {
  name: 'Add Contacts to Sequence',
  key: 'add_contacts_to_sequence',
  description: `Add one or more contacts to an existing email sequence. Contacts must already exist in your Apollo database before being added to a sequence. Requires a master API key.`,
  constraints: [
    'Requires a master API key',
    'Contacts must already exist in your Apollo database'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sequenceId: z.string().describe('The Apollo sequence ID to add contacts to'),
      contactIds: z
        .array(z.string())
        .describe('Array of Apollo contact IDs to add to the sequence'),
      emailAccountId: z.string().describe('Email account ID to send from'),
      userId: z.string().optional().describe('Apollo user ID on whose behalf to send')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      contactsAdded: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    await client.addContactsToSequence(
      ctx.input.sequenceId,
      ctx.input.contactIds,
      ctx.input.emailAccountId,
      ctx.input.userId
    );

    return {
      output: {
        success: true,
        contactsAdded: ctx.input.contactIds.length
      },
      message: `Added **${ctx.input.contactIds.length}** contact(s) to sequence \`${ctx.input.sequenceId}\`.`
    };
  })
  .build();

export let updateContactSequenceStatus = SlateTool.create(spec, {
  name: 'Update Contact Sequence Status',
  key: 'update_contact_sequence_status',
  description: `Mark contacts as finished in a sequence, remove them from the sequence, or stop their sequence progress.`,
  constraints: ['Requires a master API key'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sequenceId: z.string().describe('The Apollo sequence ID'),
      contactIds: z.array(z.string()).describe('Array of contact IDs to update'),
      status: z
        .enum(['finished', 'mark_as_finished', 'remove', 'stop'])
        .describe(
          '"finished" or "mark_as_finished" to mark complete, "remove" to remove contacts, or "stop" to halt progress'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      contactsUpdated: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let mode = ctx.input.status === 'finished' ? 'mark_as_finished' : ctx.input.status;

    await client.updateContactStatusInSequence(
      ctx.input.contactIds,
      ctx.input.sequenceId,
      mode
    );

    return {
      output: {
        success: true,
        contactsUpdated: ctx.input.contactIds.length
      },
      message: `Updated **${ctx.input.contactIds.length}** contact(s) to status "${ctx.input.status}" in sequence \`${ctx.input.sequenceId}\`.`
    };
  })
  .build();
