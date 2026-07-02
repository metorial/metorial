import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let segmentOutputSchema = z.object({
  segmentId: z.string().describe('Segment ID.'),
  name: z.string().describe('Segment name.'),
  createdAt: z.string().optional().describe('Creation timestamp.')
});

let contactSummarySchema = z.object({
  contactId: z.string().describe('Contact ID.'),
  email: z.string().describe('Email address.'),
  firstName: z.string().optional().nullable().describe('First name.'),
  lastName: z.string().optional().nullable().describe('Last name.'),
  unsubscribed: z.boolean().optional().describe('Subscription status.'),
  createdAt: z.string().optional().describe('Creation timestamp.')
});

export let createSegment = SlateTool.create(spec, {
  name: 'Create Segment',
  key: 'create_segment',
  description: `Create a Resend segment that contacts can be added to for broadcast targeting.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Segment name.')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('ID of the created segment.'),
      name: z.string().describe('Segment name.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createSegment(ctx.input.name);

    return {
      output: {
        segmentId: result.id,
        name: result.name
      },
      message: `Segment **${result.name}** created with ID \`${result.id}\`.`
    };
  })
  .build();

export let getSegment = SlateTool.create(spec, {
  name: 'Get Segment',
  key: 'get_segment',
  description: `Retrieve a Resend segment by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.string().describe('Segment ID.')
    })
  )
  .output(segmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSegment(ctx.input.segmentId);

    return {
      output: {
        segmentId: result.id,
        name: result.name,
        createdAt: result.created_at
      },
      message: `Segment **${result.name}** retrieved.`
    };
  })
  .build();

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `List Resend segments in the authenticated team.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      segments: z.array(segmentOutputSchema).describe('List of segments.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSegments({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });
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
      message: `Found **${segments.length}** segment(s).`
    };
  })
  .build();

export let listSegmentContacts = SlateTool.create(spec, {
  name: 'List Segment Contacts',
  key: 'list_segment_contacts',
  description: `List contacts that belong to a Resend segment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.string().describe('Segment ID.'),
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSummarySchema).describe('Contacts in the segment.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSegmentContacts(ctx.input.segmentId, {
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });
    let contacts = (result.data || []).map((contact: any) => ({
      contactId: contact.id,
      email: contact.email,
      firstName: contact.first_name,
      lastName: contact.last_name,
      unsubscribed: contact.unsubscribed,
      createdAt: contact.created_at
    }));

    return {
      output: {
        contacts,
        hasMore: result.has_more ?? false
      },
      message: `Found **${contacts.length}** contact(s) in segment \`${ctx.input.segmentId}\`.`
    };
  })
  .build();

export let deleteSegment = SlateTool.create(spec, {
  name: 'Delete Segment',
  key: 'delete_segment',
  description: `Delete a Resend segment. Contacts are not deleted.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      segmentId: z.string().describe('Segment ID.')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('Deleted segment ID.'),
      deleted: z.boolean().describe('Whether the segment was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteSegment(ctx.input.segmentId);

    return {
      output: {
        segmentId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Segment \`${result.id}\` has been **deleted**.`
    };
  })
  .build();
