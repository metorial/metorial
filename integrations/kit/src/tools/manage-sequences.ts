import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import { spec } from '../spec';

let daySchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]);

let sequenceSchema = z.object({
  sequenceId: z.number().describe('Unique sequence ID'),
  name: z.string().describe('Sequence name'),
  hold: z.boolean().describe('Whether subscribers stay active after the last email'),
  repeat: z.boolean().describe('Whether subscribers can restart the sequence'),
  active: z.boolean().optional().describe('Whether the sequence is active'),
  createdAt: z.string().describe('When the sequence was created'),
  emailAddress: z.string().nullable().optional().describe('Configured sending email'),
  emailTemplateId: z.number().nullable().optional().describe('Default email template ID'),
  emailCount: z.number().optional().describe('Number of emails in the sequence'),
  subscriberCount: z.number().optional().describe('Number of subscribers in the sequence'),
  sendDays: z.array(z.string()).optional().describe('Days this sequence can send'),
  sendHour: z.number().optional().describe('Hour of day this sequence can send'),
  timeZone: z.string().optional().describe('Sequence sending time zone')
});

let subscriberSchema = z.object({
  subscriberId: z.number().describe('Subscriber ID'),
  emailAddress: z.string().describe('Subscriber email'),
  firstName: z.string().nullable().optional().describe('Subscriber first name'),
  state: z.string().describe('Subscriber state')
});

export let manageSequences = SlateTool.create(spec, {
  name: 'Manage Sequences',
  key: 'manage_sequences',
  description: `Create, get, update, delete, list, and subscribe people to Kit email sequences. Also lists subscribers for a specific sequence.`,
  instructions: [
    'Use action=create to create an empty sequence, then use manage_sequence_emails to add email steps.',
    'Use active=false when creating or updating draft/test sequences to prevent accidental delivery.',
    'Use senderEmailAddress for the sequence sending address; emailAddress is reserved for add_subscriber.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'add_subscriber',
          'list_subscribers'
        ])
        .describe('The operation to perform'),
      sequenceId: z
        .number()
        .optional()
        .describe(
          'Sequence ID (required for get, update, delete, add_subscriber, list_subscribers)'
        ),
      name: z.string().optional().describe('Sequence name (required for create)'),
      senderEmailAddress: z
        .string()
        .optional()
        .describe('Sending email address for create/update'),
      emailTemplateId: z
        .number()
        .optional()
        .describe('Default email template ID for create/update'),
      sendDays: z.array(daySchema).optional().describe('Days this sequence can send'),
      sendHour: z.number().optional().describe('Hour of day, 0 through 23'),
      timeZone: z.string().optional().describe('IANA time zone for the sequence'),
      active: z.boolean().optional().describe('Whether the sequence is active'),
      repeat: z.boolean().optional().describe('Whether subscribers can restart the sequence'),
      hold: z
        .boolean()
        .optional()
        .describe('Whether subscribers stay active after the last published email'),
      excludeSubscriberSources: z
        .array(
          z.object({
            type: z
              .enum(['tag', 'sequence', 'form', 'segment'])
              .describe('Subscriber source type to exclude'),
            ids: z.array(z.number()).describe('Source IDs to exclude')
          })
        )
        .optional()
        .describe('Subscriber source filters to exclude from the sequence'),
      subscriberId: z.number().optional().describe('Subscriber ID for add_subscriber'),
      emailAddress: z.string().optional().describe('Subscriber email for add_subscriber'),
      status: z
        .enum(['active', 'inactive', 'bounced', 'complained', 'cancelled', 'all'])
        .optional()
        .describe('Subscriber status filter for list_subscribers'),
      perPage: z.number().optional().describe('Number of results per page (max 1000)'),
      afterCursor: z.string().optional().describe('Pagination cursor to fetch next page'),
      beforeCursor: z.string().optional().describe('Pagination cursor to fetch previous page')
    })
  )
  .output(
    z.object({
      sequences: z.array(sequenceSchema).optional().describe('List of sequences'),
      sequence: sequenceSchema.optional().describe('Single sequence'),
      subscribers: z.array(subscriberSchema).optional().describe('Subscribers in a sequence'),
      subscriber: subscriberSchema.optional().describe('Subscriber added to a sequence'),
      deleted: z.boolean().optional().describe('Whether the sequence was deleted'),
      hasNextPage: z.boolean().optional().describe('Whether more results are available'),
      endCursor: z.string().nullable().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapSequence = (s: any) => ({
      sequenceId: s.id,
      name: s.name,
      hold: s.hold,
      repeat: s.repeat,
      active: s.active,
      createdAt: s.created_at,
      emailAddress: s.email_address,
      emailTemplateId: s.email_template_id,
      emailCount: s.email_count,
      subscriberCount: s.subscriber_count,
      sendDays: s.send_days,
      sendHour: s.send_hour,
      timeZone: s.time_zone
    });

    let mapSubscriber = (s: any) => ({
      subscriberId: s.id,
      emailAddress: s.email_address,
      firstName: s.first_name,
      state: s.state
    });

    let requireSequenceId = (action: string) => {
      if (!ctx.input.sequenceId) {
        throw kitServiceError(`Sequence ID is required for ${action}`);
      }

      return ctx.input.sequenceId;
    };

    if (ctx.input.action === 'list') {
      let result = await client.listSequences({
        perPage: ctx.input.perPage,
        after: ctx.input.afterCursor,
        before: ctx.input.beforeCursor
      });
      let sequences = result.data.map(mapSequence);
      return {
        output: {
          sequences,
          hasNextPage: result.pagination.has_next_page,
          endCursor: result.pagination.end_cursor
        },
        message: `Found **${sequences.length}** sequences.`
      };
    }

    if (ctx.input.action === 'get') {
      let data = await client.getSequence(requireSequenceId('get'));
      return {
        output: { sequence: mapSequence(data.sequence) },
        message: `Retrieved sequence **${data.sequence.name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw kitServiceError('Sequence name is required for create');
      }

      let data = await client.createSequence({
        name: ctx.input.name,
        emailAddress: ctx.input.senderEmailAddress,
        emailTemplateId: ctx.input.emailTemplateId,
        sendDays: ctx.input.sendDays,
        sendHour: ctx.input.sendHour,
        timeZone: ctx.input.timeZone,
        active: ctx.input.active,
        repeat: ctx.input.repeat,
        hold: ctx.input.hold,
        excludeSubscriberSources: ctx.input.excludeSubscriberSources
      });

      return {
        output: { sequence: mapSequence(data.sequence) },
        message: `Created sequence **${data.sequence.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let sequenceId = requireSequenceId('update');
      let data = await client.updateSequence(sequenceId, {
        name: ctx.input.name,
        emailAddress: ctx.input.senderEmailAddress,
        emailTemplateId: ctx.input.emailTemplateId,
        sendDays: ctx.input.sendDays,
        sendHour: ctx.input.sendHour,
        timeZone: ctx.input.timeZone,
        active: ctx.input.active,
        repeat: ctx.input.repeat,
        hold: ctx.input.hold,
        excludeSubscriberSources: ctx.input.excludeSubscriberSources
      });

      return {
        output: { sequence: mapSequence(data.sequence) },
        message: `Updated sequence **${data.sequence.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let sequenceId = requireSequenceId('delete');
      await client.deleteSequence(sequenceId);
      return {
        output: { deleted: true },
        message: `Deleted sequence \`${sequenceId}\`.`
      };
    }

    if (ctx.input.action === 'add_subscriber') {
      let sequenceId = requireSequenceId('add_subscriber');
      if (!ctx.input.subscriberId && !ctx.input.emailAddress) {
        throw kitServiceError('Provide either subscriberId or emailAddress');
      }

      let data = ctx.input.subscriberId
        ? await client.addSubscriberToSequence(sequenceId, ctx.input.subscriberId)
        : await client.addSubscriberToSequenceByEmail(sequenceId, ctx.input.emailAddress!);

      return {
        output: { subscriber: mapSubscriber(data.subscriber) },
        message: `Added **${data.subscriber.email_address}** to sequence \`${sequenceId}\`.`
      };
    }

    if (ctx.input.action === 'list_subscribers') {
      let sequenceId = requireSequenceId('list_subscribers');
      let result = await client.listSubscribersForSequence(sequenceId, {
        status: ctx.input.status,
        perPage: ctx.input.perPage,
        after: ctx.input.afterCursor,
        before: ctx.input.beforeCursor
      });
      let subscribers = result.data.map(mapSubscriber);
      return {
        output: {
          subscribers,
          hasNextPage: result.pagination.has_next_page,
          endCursor: result.pagination.end_cursor
        },
        message: `Found **${subscribers.length}** subscribers in sequence \`${sequenceId}\`.`
      };
    }

    throw kitServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
