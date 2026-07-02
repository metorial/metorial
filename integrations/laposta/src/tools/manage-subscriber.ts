import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let memberOutputSchema = z.object({
  memberId: z.string().describe('Unique identifier of the subscriber'),
  listId: z.string().describe('ID of the list the subscriber belongs to'),
  email: z.string().describe('Email address of the subscriber'),
  state: z.string().describe('Status: active, unsubscribed, unconfirmed, or cleaned'),
  signupDate: z.string().describe('Date the subscriber was added'),
  modified: z.string().describe('Last modified timestamp'),
  ip: z.string().describe('IP address at signup'),
  sourceUrl: z.string().describe('URL where the subscriber signed up'),
  customFields: z
    .record(z.string(), z.string())
    .describe('Custom field values for the subscriber')
});

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
        .describe('Filter subscribers by state')
    })
  )
  .output(
    z.object({
      subscribers: z.array(memberOutputSchema).describe('Retrieved subscribers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.memberId) {
      let result = await client.getMember(ctx.input.memberId, ctx.input.listId);
      let member = result.member;
      return {
        output: {
          subscribers: [
            {
              memberId: member.member_id,
              listId: member.list_id,
              email: member.email,
              state: member.state,
              signupDate: member.signup_date,
              modified: member.modified,
              ip: member.ip,
              sourceUrl: member.source_url,
              customFields: member.custom_fields
            }
          ]
        },
        message: `Retrieved subscriber **${member.email}** (${member.state}).`
      };
    }

    let results = await client.getMembers(ctx.input.listId, ctx.input.state);
    let subscribers = results.map(r => {
      let member = r.member;
      return {
        memberId: member.member_id,
        listId: member.list_id,
        email: member.email,
        state: member.state,
        signupDate: member.signup_date,
        modified: member.modified,
        ip: member.ip,
        sourceUrl: member.source_url,
        customFields: member.custom_fields
      };
    });

    return {
      output: { subscribers },
      message: `Retrieved ${subscribers.length} subscriber(s)${ctx.input.state ? ` with state "${ctx.input.state}"` : ''}.`
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
        .describe('Custom field values keyed by field tag'),
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
      customFields: ctx.input.customFields,
      options: Object.keys(options).length > 0 ? options : undefined
    });

    let member = result.member;
    return {
      output: {
        memberId: member.member_id,
        listId: member.list_id,
        email: member.email,
        state: member.state,
        signupDate: member.signup_date,
        modified: member.modified,
        ip: member.ip,
        sourceUrl: member.source_url,
        customFields: member.custom_fields
      },
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
        .describe('Custom field values to update, keyed by field tag')
    })
  )
  .output(memberOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateMember(ctx.input.memberId, {
      listId: ctx.input.listId,
      email: ctx.input.email,
      state: ctx.input.state,
      customFields: ctx.input.customFields
    });

    let member = result.member;
    return {
      output: {
        memberId: member.member_id,
        listId: member.list_id,
        email: member.email,
        state: member.state,
        signupDate: member.signup_date,
        modified: member.modified,
        ip: member.ip,
        sourceUrl: member.source_url,
        customFields: member.custom_fields
      },
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
      output: {
        memberId: member.member_id,
        listId: member.list_id,
        email: member.email,
        state: member.state,
        signupDate: member.signup_date,
        modified: member.modified,
        ip: member.ip,
        sourceUrl: member.source_url,
        customFields: member.custom_fields
      },
      message: `Deleted subscriber **${member.email}** from list ${member.list_id}.`
    };
  })
  .build();

export let bulkSyncSubscribers = SlateTool.create(spec, {
  name: 'Bulk Sync Subscribers',
  key: 'bulk_sync_subscribers',
  description: `Performs bulk add, update, or unsubscribe operations on subscribers in a Laposta mailing list. Supports up to 500,000 subscribers per request (paid accounts only). The **unsubscribeExcluded** action will unsubscribe all list members not present in the request.`,
  constraints: [
    'Limited to paid accounts only.',
    'Maximum of 500,000 members per request.',
    'The unsubscribeExcluded action is destructive: it unsubscribes all members NOT in the provided list.'
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
              .describe('Custom field values keyed by field tag'),
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
      unsubscribedCount: z.number().describe('Number of members unsubscribed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.bulkSyncMembers(ctx.input.listId, {
      actions: ctx.input.actions,
      members: ctx.input.members.map(m => ({
        member_id: m.memberId,
        email: m.email,
        custom_fields: m.customFields,
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
        unsubscribedCount: report.unsubscribed_count
      },
      message: `Bulk sync completed: ${report.added_count} added, ${report.edited_count} updated, ${report.unsubscribed_count} unsubscribed, ${report.errors_count} errors.`
    };
  })
  .build();
