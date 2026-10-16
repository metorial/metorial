import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  mapMember,
  memberOutputSchema,
  memberReadOutputSchema,
  paginationSchema
} from '../lib/maps';
import { spec } from '../spec';

let customFieldInputSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.array(z.string())]))
  .describe(
    'Native custom field values keyed by custom_name from get_fields; overrides matching customFields entries'
  );

export let getSubscribers = SlateTool.create(spec, {
  name: 'Get Subscribers',
  key: 'get_subscribers',
  description: `Retrieves subscribers from a Laposta mailing list. Provide a **memberId** to fetch a specific subscriber, or retrieve all subscribers optionally filtered by state (active, unsubscribed, cleaned).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to retrieve subscribers from'),
      memberId: z
        .string()
        .optional()
        .describe('ID or email of a specific subscriber to retrieve'),
      state: z
        .enum(['active', 'unsubscribed', 'cleaned'])
        .optional()
        .describe('Filter subscribers by state'),
      limit: z
        .number()
        .optional()
        .describe(
          'Maximum subscribers per page, 1-1000. Omit both limit and cursor to retrieve the complete list.'
        ),
      cursor: z
        .string()
        .optional()
        .describe('Opaque cursor from pagination.nextCursor; keep all filters unchanged'),
      search: z
        .string()
        .optional()
        .describe('Search subscriber email and custom field values, up to 255 characters'),
      label: z.string().optional().describe('Filter by one existing label name'),
      orderBy: z
        .string()
        .optional()
        .describe('email, signup_date, or comma-separated custom text field names'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      subscribers: z.array(memberReadOutputSchema).describe('Retrieved subscribers'),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.memberId) {
      let result = await client.getMember(ctx.input.memberId, ctx.input.listId);
      let member = result.member;
      return {
        output: {
          subscribers: [mapMember(member, memberReadOutputSchema)]
        },
        message: `Retrieved subscriber **${member.email}** (${member.state}).`
      };
    }

    let result = await client.getMembers(ctx.input.listId, ctx.input.state, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      search: ctx.input.search,
      label: ctx.input.label,
      order_by: ctx.input.orderBy,
      order: ctx.input.order
    });
    let subscribers = result.members.map(r => {
      let member = r.member;
      return mapMember(member, memberReadOutputSchema);
    });

    return {
      output: { subscribers, pagination: result.pagination },
      message: `Retrieved ${subscribers.length} subscriber(s)${result.pagination ? ' on this page' : ''}${ctx.input.state ? ` with state "${ctx.input.state}"` : ''}.`
    };
  })
  .build();

export let addSubscriber = SlateTool.create(spec, {
  name: 'Add Subscriber',
  key: 'add_subscriber',
  description: `Adds a new subscriber to a Laposta mailing list. Supports **upsert** mode to update an existing subscriber if the email already exists. Can suppress double opt-in confirmation emails, reactivation of unsubscribed contacts, and email notifications.`,
  instructions: [
    'Use the **upsert** option to safely add or update a subscriber without checking if they already exist.',
    'Set **ignoreDoubleOptin** to true to skip sending a confirmation email on double opt-in lists.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to add the subscriber to'),
      email: z.string().describe('Email address of the subscriber'),
      ip: z.string().describe('IP address of the subscriber at signup'),
      sourceUrl: z.string().optional().describe('URL where the subscriber signed up'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values keyed by custom_name from get_fields'),
      customFieldValues: customFieldInputSchema.optional(),
      upsert: z
        .boolean()
        .optional()
        .describe('If true, updates existing subscriber instead of failing on duplicate'),
      suppressReactivation: z
        .boolean()
        .optional()
        .describe('If true, does not reactivate previously unsubscribed contacts'),
      suppressEmailNotification: z
        .boolean()
        .optional()
        .describe('If true, suppresses notification emails for this API signup'),
      ignoreDoubleOptin: z
        .boolean()
        .optional()
        .describe('If true, skips sending the double opt-in confirmation email')
    })
  )
  .output(memberOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let options: Record<string, boolean> = {};
    if (ctx.input.upsert) options.upsert = true;
    if (ctx.input.suppressReactivation) options.suppress_reactivation = true;
    if (ctx.input.suppressEmailNotification) options.suppress_email_notification = true;
    if (ctx.input.ignoreDoubleOptin) options.ignore_doubleoptin = true;

    let result = await client.createMember({
      listId: ctx.input.listId,
      email: ctx.input.email,
      ip: ctx.input.ip,
      sourceUrl: ctx.input.sourceUrl,
      customFields:
        ctx.input.customFields || ctx.input.customFieldValues
          ? { ...ctx.input.customFields, ...ctx.input.customFieldValues }
          : undefined,
      options: Object.keys(options).length > 0 ? options : undefined
    });

    let member = result.member;
    return {
      output: mapMember(member, memberOutputSchema),
      message: `Added subscriber **${member.email}** to list ${member.list_id} (${member.state}).`
    };
  })
  .build();

export let updateSubscriber = SlateTool.create(spec, {
  name: 'Update Subscriber',
  key: 'update_subscriber',
  description: `Updates an existing subscriber's data in a Laposta mailing list. Can change email, state, and custom field values.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list the subscriber belongs to'),
      memberId: z.string().describe('ID of the subscriber to update'),
      email: z.string().optional().describe('New email address'),
      state: z
        .enum(['active', 'unsubscribed'])
        .optional()
        .describe('New state for the subscriber'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values to update, keyed by custom_name from get_fields'),
      customFieldValues: customFieldInputSchema.optional()
    })
  )
  .output(memberOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateMember(ctx.input.memberId, {
      listId: ctx.input.listId,
      email: ctx.input.email,
      state: ctx.input.state,
      customFields:
        ctx.input.customFields || ctx.input.customFieldValues
          ? { ...ctx.input.customFields, ...ctx.input.customFieldValues }
          : undefined
    });

    let member = result.member;
    return {
      output: mapMember(member, memberOutputSchema),
      message: `Updated subscriber **${member.email}** (${member.state}).`
    };
  })
  .build();

export let deleteSubscriber = SlateTool.create(spec, {
  name: 'Delete Subscriber',
  key: 'delete_subscriber',
  description: `Permanently removes a subscriber from a Laposta mailing list. This is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list the subscriber belongs to'),
      memberId: z.string().describe('ID of the subscriber to delete')
    })
  )
  .output(memberOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteMember(ctx.input.memberId, ctx.input.listId);

    let member = result.member;
    return {
      output: mapMember(member, memberOutputSchema),
      message: `Deleted subscriber **${member.email}** from list ${member.list_id}.`
    };
  })
  .build();

export let bulkSyncSubscribers = SlateTool.create(spec, {
  name: 'Bulk Sync Subscribers',
  key: 'bulk_sync_subscribers',
  description: `Performs bulk add, update, or unsubscribe operations on subscribers in a Laposta mailing list. Supports up to 500,000 subscribers per request (paid accounts only). The **unsubscribe_excluded** action will unsubscribe all list members not present in the request.`,
  constraints: [
    'Limited to paid accounts only.',
    'Maximum of 500,000 members per request.',
    'The unsubscribe_excluded action is destructive: it unsubscribes all members NOT in the provided list.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to sync subscribers for'),
      actions: z
        .array(z.enum(['add', 'update', 'unsubscribe_excluded']))
        .describe(
          'Actions to perform: add new, update existing, and/or unsubscribe members not in the list'
        ),
      members: z
        .array(
          z.object({
            memberId: z
              .string()
              .optional()
              .describe('Existing member ID (required for updates without email)'),
            email: z
              .string()
              .optional()
              .describe('Email address (required for adding new members)'),
            customFields: z
              .record(z.string(), z.string())
              .optional()
              .describe('Custom field values keyed by custom_name from get_fields'),
            customFieldValues: customFieldInputSchema.optional(),
            state: z
              .enum(['active', 'unsubscribed'])
              .optional()
              .describe(
                'State to apply to this subscriber; use update to unsubscribe selected members'
              ),
            sourceUrl: z.string().optional().describe('URL source of the subscriber')
          })
        )
        .describe('Array of subscriber records to sync')
    })
  )
  .output(
    z.object({
      providedCount: z.number().describe('Number of members provided in the request'),
      errorsCount: z.number().describe('Number of errors during sync'),
      skippedCount: z.number().describe('Number of skipped members'),
      editedCount: z.number().describe('Number of members updated'),
      addedCount: z.number().describe('Number of new members added'),
      unsubscribedCount: z.number().describe('Number of members unsubscribed'),
      raw: z
        .record(z.string(), z.unknown())
        .describe('Original bulk response, including errors and processed member records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.bulkSyncMembers(ctx.input.listId, {
      actions: ctx.input.actions,
      members: ctx.input.members.map(m => ({
        member_id: m.memberId,
        email: m.email,
        custom_fields:
          m.customFields || m.customFieldValues
            ? { ...m.customFields, ...m.customFieldValues }
            : undefined,
        state: m.state,
        source_url: m.sourceUrl
      }))
    });

    let report = result.report;
    return {
      output: {
        providedCount: report.provided_count,
        errorsCount: report.errors_count,
        skippedCount: report.skipped_count,
        editedCount: report.edited_count,
        addedCount: report.added_count,
        unsubscribedCount: report.unsubscribed_count,
        raw: { ...result }
      },
      message: `Bulk sync completed: ${report.added_count} added, ${report.edited_count} updated, ${report.unsubscribed_count} unsubscribed, ${report.errors_count} errors.`
    };
  })
  .build();
