import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import type { Sequence } from '../lib/types';
import { spec } from '../spec';

let formatSequence = (s: Sequence) => ({
  sequenceId: s.id,
  sequenceName: s.name,
  hold: s.hold,
  repeat: s.repeat,
  active: s.active,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
  emailAddress: s.email_address,
  emailTemplateId: s.email_template_id,
  sendDays: s.send_days,
  sendHour: s.send_hour,
  timeZone: s.time_zone,
  emailCount: s.email_count,
  subscriberCount: s.subscriber_count
});

export let manageSequences = SlateTool.create(spec, {
  name: 'Manage Sequences',
  key: 'manage_sequences',
  description: `Create, update, get, delete, list email sequences, or enroll subscribers in a sequence. Sequences are automated drip email campaigns that send a series of emails over time.`,
  instructions: [
    'Use action "list" to view all sequences.',
    'Use action "create" with name to create an empty sequence.',
    'Use action "get" with sequenceId to retrieve sequence settings.',
    'Use action "update" with sequenceId and fields to change sequence settings.',
    'Use action "delete" with sequenceId to soft-delete a sequence.',
    'Use action "add_subscriber" to enroll a subscriber — provide sequenceId and either subscriberId or subscriberEmail.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'update', 'delete', 'add_subscriber'])
        .describe('Action to perform'),
      sequenceId: z.number().optional().describe('Sequence ID (required for add_subscriber)'),
      name: z.string().optional().describe('Sequence name (required for create)'),
      emailAddress: z.string().optional().describe('Sending email address to use'),
      emailTemplateId: z.number().optional().describe('Email template ID to use'),
      sendDays: z
        .array(
          z.enum([
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday'
          ])
        )
        .optional()
        .describe('Days of week the sequence may send on'),
      sendHour: z.number().optional().describe('Hour of day to send, 0 through 23'),
      timeZone: z.string().optional().describe('IANA timezone for sequence sends'),
      active: z.boolean().optional().describe('Whether the sequence is active'),
      repeat: z.boolean().optional().describe('Whether subscribers can restart the sequence'),
      hold: z
        .boolean()
        .optional()
        .describe('Whether subscribers stay active after receiving all published emails'),
      excludeSubscriberSources: z
        .array(
          z.object({
            type: z.enum(['tag', 'sequence', 'form', 'segment']),
            ids: z.array(z.number())
          })
        )
        .optional()
        .describe('Subscriber sources to exclude from the sequence'),
      subscriberId: z.number().optional().describe('Subscriber ID to enroll'),
      subscriberEmail: z.string().optional().describe('Subscriber email to enroll'),
      perPage: z.number().optional().describe('Results per page'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      sequences: z
        .array(
          z.object({
            sequenceId: z.number().describe('Sequence ID'),
            sequenceName: z.string().describe('Sequence name'),
            hold: z.boolean().describe('Whether the sequence is on hold'),
            repeat: z.boolean().describe('Whether the sequence repeats'),
            active: z.boolean().optional().describe('Whether the sequence is active'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp'),
            emailAddress: z.string().nullable().optional(),
            emailTemplateId: z.number().nullable().optional(),
            sendDays: z.array(z.string()).optional(),
            sendHour: z.number().optional(),
            timeZone: z.string().optional(),
            emailCount: z.number().optional(),
            subscriberCount: z.number().optional()
          })
        )
        .optional()
        .describe('List of sequences (for list action)'),
      sequence: z
        .object({
          sequenceId: z.number().describe('Sequence ID'),
          sequenceName: z.string().describe('Sequence name'),
          hold: z.boolean().describe('Whether the sequence is on hold'),
          repeat: z.boolean().describe('Whether the sequence repeats'),
          active: z.boolean().optional().describe('Whether the sequence is active'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp'),
          emailAddress: z.string().nullable().optional(),
          emailTemplateId: z.number().nullable().optional(),
          sendDays: z.array(z.string()).optional(),
          sendHour: z.number().optional(),
          timeZone: z.string().optional(),
          emailCount: z.number().optional(),
          subscriberCount: z.number().optional()
        })
        .optional()
        .describe('Single sequence (for create, get, update)'),
      deleted: z.boolean().optional().describe('Whether the sequence was deleted'),
      hasNextPage: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let input = ctx.input;

    if (input.action === 'list') {
      let result = await client.listSequences({ perPage: input.perPage, after: input.cursor });
      let sequences = result.sequences.map(formatSequence);
      return {
        output: {
          sequences,
          hasNextPage: result.pagination.has_next_page,
          nextCursor: result.pagination.end_cursor
        },
        message: `Found **${sequences.length}** sequence(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
      };
    }

    if (input.action === 'create') {
      if (!input.name) throw kitServiceError('name is required for create');
      let sequence = await client.createSequence({
        name: input.name,
        emailAddress: input.emailAddress,
        emailTemplateId: input.emailTemplateId,
        sendDays: input.sendDays,
        sendHour: input.sendHour,
        timeZone: input.timeZone,
        active: input.active,
        repeat: input.repeat,
        hold: input.hold,
        excludeSubscriberSources: input.excludeSubscriberSources
      });
      return {
        output: {
          sequence: formatSequence(sequence)
        },
        message: `Created sequence **${sequence.name}** (#${sequence.id})`
      };
    }

    if (input.action === 'get') {
      if (!input.sequenceId) throw kitServiceError('sequenceId is required for get');
      let sequence = await client.getSequence(input.sequenceId);
      return {
        output: {
          sequence: formatSequence(sequence)
        },
        message: `Sequence **${sequence.name}** (#${sequence.id})`
      };
    }

    if (input.action === 'update') {
      if (!input.sequenceId) throw kitServiceError('sequenceId is required for update');
      let sequence = await client.updateSequence(input.sequenceId, {
        name: input.name,
        emailAddress: input.emailAddress,
        emailTemplateId: input.emailTemplateId,
        sendDays: input.sendDays,
        sendHour: input.sendHour,
        timeZone: input.timeZone,
        active: input.active,
        repeat: input.repeat,
        hold: input.hold,
        excludeSubscriberSources: input.excludeSubscriberSources
      });
      return {
        output: {
          sequence: formatSequence(sequence)
        },
        message: `Updated sequence **${sequence.name}** (#${sequence.id})`
      };
    }

    if (input.action === 'delete') {
      if (!input.sequenceId) throw kitServiceError('sequenceId is required for delete');
      await client.deleteSequence(input.sequenceId);
      return {
        output: {
          deleted: true
        },
        message: `Deleted sequence #${input.sequenceId}`
      };
    }

    if (input.action === 'add_subscriber') {
      if (!input.sequenceId)
        throw kitServiceError('sequenceId is required for add_subscriber');
      if (input.subscriberId) {
        await client.addSubscriberToSequenceById(input.sequenceId, input.subscriberId);
        return {
          output: {},
          message: `Enrolled subscriber #${input.subscriberId} in sequence #${input.sequenceId}`
        };
      } else if (input.subscriberEmail) {
        await client.addSubscriberToSequenceByEmail(input.sequenceId, input.subscriberEmail);
        return {
          output: {},
          message: `Enrolled **${input.subscriberEmail}** in sequence #${input.sequenceId}`
        };
      }
      throw kitServiceError('subscriberId or subscriberEmail is required for add_subscriber');
    }

    throw kitServiceError(`Unknown action: ${input.action}`);
  });
