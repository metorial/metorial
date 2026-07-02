import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactOutputSchema = z.object({
  contactId: z.string().describe('ID of the contact.'),
  email: z.string().optional().describe('Contact email address.'),
  firstName: z.string().optional().nullable().describe('First name.'),
  lastName: z.string().optional().nullable().describe('Last name.'),
  unsubscribed: z
    .boolean()
    .optional()
    .describe('Whether the contact is globally unsubscribed.'),
  createdAt: z.string().optional().describe('Creation timestamp.'),
  properties: z
    .record(z.string(), z.any())
    .optional()
    .nullable()
    .describe('Custom contact properties.')
});

let segmentOutputSchema = z.object({
  segmentId: z.string().describe('Segment ID.'),
  name: z.string().optional().describe('Segment name.'),
  createdAt: z.string().optional().describe('Creation timestamp.')
});

let topicSubscriptionSchema = z.object({
  topicId: z.string().describe('Topic ID.'),
  name: z.string().optional().describe('Topic name.'),
  description: z.string().optional().nullable().describe('Topic description.'),
  subscription: z.enum(['opt_in', 'opt_out']).describe('Contact subscription status.')
});

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact with an email address. Optionally set name, subscription status, and custom properties for broadcast personalization.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Contact email address.'),
      firstName: z.string().optional().describe('First name.'),
      lastName: z.string().optional().describe('Last name.'),
      unsubscribed: z
        .boolean()
        .optional()
        .describe('Set to true to globally unsubscribe from all broadcasts.'),
      properties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom properties as key-value pairs for personalization.'),
      segments: z
        .array(z.string())
        .optional()
        .describe('Segment IDs to add the new contact to.'),
      topics: z
        .array(
          z.object({
            id: z.string().describe('Topic ID.'),
            subscription: z
              .enum(['opt_in', 'opt_out'])
              .describe('Initial topic subscription status.')
          })
        )
        .optional()
        .describe('Initial topic subscriptions for the contact.')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the created contact.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createContact({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      unsubscribed: ctx.input.unsubscribed,
      properties: ctx.input.properties,
      segments: ctx.input.segments,
      topics: ctx.input.topics
    });

    return {
      output: { contactId: result.id },
      message: `Contact **${ctx.input.email}** created with ID \`${result.id}\`.`
    };
  })
  .build();

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a contact's details by their ID or email address.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactIdOrEmail: z.string().describe('Contact ID (UUID) or email address.')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contact = await client.getContact(ctx.input.contactIdOrEmail);

    return {
      output: {
        contactId: contact.id,
        email: contact.email,
        firstName: contact.first_name,
        lastName: contact.last_name,
        unsubscribed: contact.unsubscribed,
        createdAt: contact.created_at,
        properties: contact.properties
      },
      message: `Contact **${contact.email}** — ${contact.unsubscribed ? 'unsubscribed' : 'subscribed'}.`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update a contact's name, subscription status, or custom properties. Look up by contact ID or email address.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactIdOrEmail: z.string().describe('Contact ID (UUID) or email address.'),
      firstName: z.string().optional().describe('Updated first name.'),
      lastName: z.string().optional().describe('Updated last name.'),
      unsubscribed: z.boolean().optional().describe('Update global subscription status.'),
      properties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated custom properties.')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the updated contact.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateContact(ctx.input.contactIdOrEmail, {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      unsubscribed: ctx.input.unsubscribed,
      properties: ctx.input.properties
    });

    return {
      output: { contactId: result.id },
      message: `Contact \`${result.id}\` updated.`
    };
  })
  .build();

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts, optionally filtered by segment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.string().optional().describe('Filter contacts by segment ID.'),
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Contact ID.'),
            email: z.string().describe('Email address.'),
            firstName: z.string().optional().nullable().describe('First name.'),
            lastName: z.string().optional().nullable().describe('Last name.'),
            unsubscribed: z.boolean().optional().describe('Subscription status.'),
            createdAt: z.string().optional().describe('Creation timestamp.')
          })
        )
        .describe('List of contacts.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listContacts({
      segmentId: ctx.input.segmentId,
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let contacts = (result.data || []).map((c: any) => ({
      contactId: c.id,
      email: c.email,
      firstName: c.first_name,
      lastName: c.last_name,
      unsubscribed: c.unsubscribed,
      createdAt: c.created_at
    }));

    return {
      output: {
        contacts,
        hasMore: result.has_more ?? false
      },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Remove a contact by ID or email address. This is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contactIdOrEmail: z.string().describe('Contact ID (UUID) or email address to delete.')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the deleted contact.'),
      deleted: z.boolean().describe('Whether the contact was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteContact(ctx.input.contactIdOrEmail);

    return {
      output: {
        contactId: result.contact,
        deleted: result.deleted ?? true
      },
      message: `Contact \`${result.contact}\` has been **deleted**.`
    };
  })
  .build();

export let addContactToSegment = SlateTool.create(spec, {
  name: 'Add Contact to Segment',
  key: 'add_contact_to_segment',
  description: `Add an existing contact to a Resend segment by contact ID or email address.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactIdOrEmail: z.string().describe('Contact ID (UUID) or email address.'),
      segmentId: z.string().describe('Segment ID to add the contact to.')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('Segment ID.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.addContactToSegment(
      ctx.input.contactIdOrEmail,
      ctx.input.segmentId
    );

    return {
      output: { segmentId: result.id },
      message: `Contact **${ctx.input.contactIdOrEmail}** added to segment \`${result.id}\`.`
    };
  })
  .build();

export let listContactSegments = SlateTool.create(spec, {
  name: 'List Contact Segments',
  key: 'list_contact_segments',
  description: `List Resend segments that a contact belongs to by contact ID or email address.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactIdOrEmail: z.string().describe('Contact ID (UUID) or email address.')
    })
  )
  .output(
    z.object({
      segments: z.array(segmentOutputSchema).describe('Segments for the contact.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listContactSegments(ctx.input.contactIdOrEmail);
    let segments = (result.data || []).map((segment: any) => ({
      segmentId: segment.id,
      name: segment.name,
      createdAt: segment.created_at
    }));

    return {
      output: {
        segments,
        hasMore: result.has_more ?? false
      },
      message: `Found **${segments.length}** segment(s) for this contact.`
    };
  })
  .build();

export let removeContactFromSegment = SlateTool.create(spec, {
  name: 'Remove Contact From Segment',
  key: 'remove_contact_from_segment',
  description: `Remove an existing contact from a Resend segment by contact ID or email address.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contactIdOrEmail: z.string().describe('Contact ID (UUID) or email address.'),
      segmentId: z.string().describe('Segment ID to remove the contact from.')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID.'),
      segmentId: z.string().describe('Segment ID.'),
      deleted: z.boolean().describe('Whether the membership was removed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.removeContactFromSegment(
      ctx.input.contactIdOrEmail,
      ctx.input.segmentId
    );

    return {
      output: {
        contactId: result.id,
        segmentId: result.segment_id ?? result.audienceId ?? ctx.input.segmentId,
        deleted: result.deleted ?? true
      },
      message: `Contact **${ctx.input.contactIdOrEmail}** removed from segment \`${ctx.input.segmentId}\`.`
    };
  })
  .build();

export let listContactTopics = SlateTool.create(spec, {
  name: 'List Contact Topics',
  key: 'list_contact_topics',
  description: `List topic subscription preferences for a contact by contact ID or email address.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactIdOrEmail: z.string().describe('Contact ID (UUID) or email address.')
    })
  )
  .output(
    z.object({
      topics: z.array(topicSubscriptionSchema).describe('Topic subscriptions.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listContactTopics(ctx.input.contactIdOrEmail);
    let topics = (result.data || []).map((topic: any) => ({
      topicId: topic.id,
      name: topic.name,
      description: topic.description,
      subscription: topic.subscription
    }));

    return {
      output: {
        topics,
        hasMore: result.has_more ?? false
      },
      message: `Found **${topics.length}** topic subscription(s) for this contact.`
    };
  })
  .build();

export let updateContactTopics = SlateTool.create(spec, {
  name: 'Update Contact Topics',
  key: 'update_contact_topics',
  description: `Update one or more topic subscription preferences for a contact by contact ID or email address.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactIdOrEmail: z.string().describe('Contact ID (UUID) or email address.'),
      topics: z
        .array(
          z.object({
            id: z.string().describe('Topic ID.'),
            subscription: z.enum(['opt_in', 'opt_out']).describe('New subscription status.')
          })
        )
        .describe('Topic subscription updates.')
    })
  )
  .output(
    z.object({
      topicId: z.string().describe('ID returned by Resend for the topic update.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateContactTopics(ctx.input.contactIdOrEmail, {
      topics: ctx.input.topics
    });

    return {
      output: { topicId: result.id },
      message: `Updated **${ctx.input.topics.length}** topic subscription(s) for contact **${ctx.input.contactIdOrEmail}**.`
    };
  })
  .build();
