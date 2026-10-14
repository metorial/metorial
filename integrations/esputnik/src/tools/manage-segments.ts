import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validatePagination } from '../lib/schemas';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `Retrieve a page of segments (groups) in your eSputnik account. Returns each segment's ID, name, and type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by segment name'),
      startIndex: z.number().optional().describe('First result index; numbering starts at 1'),
      maxRows: z.number().optional().describe('Page size, from 1 to 500; defaults to 500')
    })
  )
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentId: z.number().describe('Segment ID'),
            name: z.string().describe('Segment name'),
            type: z.string().describe('Segment type (Static or Dynamic)')
          })
        )
        .describe('Segments in the requested page'),
      nextStartIndex: z.number().optional().describe('Next page index when this page is full')
    })
  )
  .handleInvocation(async ctx => {
    validatePagination(ctx.input.startIndex, ctx.input.maxRows);
    let client = new Client({ token: ctx.auth.token });
    let segments = await client.getSegments({
      name: ctx.input.name,
      startindex: ctx.input.startIndex,
      maxrows: ctx.input.maxRows
    });

    let mapped = (Array.isArray(segments) ? segments : []).map((s: any) => ({
      segmentId: s.id,
      name: s.name,
      type: s.type
    }));

    return {
      output: {
        segments: mapped,
        nextStartIndex:
          mapped.length === (ctx.input.maxRows ?? 500)
            ? (ctx.input.startIndex ?? 1) + mapped.length
            : undefined
      },
      message: `Found **${mapped.length}** segment(s).`
    };
  })
  .build();

export let getSegmentContacts = SlateTool.create(spec, {
  name: 'Get Segment Contacts',
  key: 'get_segment_contacts',
  description: `Retrieve a page of contacts belonging to a segment. Call list_segments to discover its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.number().describe('Segment ID. Call list_segments to discover IDs.'),
      startIndex: z.number().optional().describe('First result index; numbering starts at 1'),
      maxRows: z.number().optional().describe('Page size, from 1 to 500; defaults to 500'),
      orderByTs: z
        .boolean()
        .optional()
        .describe('Order by the time contacts were added to the segment'),
      asc: z.boolean().optional().describe('Ascending order when true, descending when false')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.number().describe('Contact ID'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            channels: z
              .array(
                z.object({
                  type: z.string().describe('Channel type'),
                  value: z.string().describe('Channel value')
                })
              )
              .optional()
              .describe('Contact channels'),
            externalCustomerId: z.string().optional().describe('External customer ID')
          })
        )
        .describe('Contacts in the requested page'),
      nextStartIndex: z.number().optional().describe('Next page index when this page is full')
    })
  )
  .handleInvocation(async ctx => {
    validatePagination(ctx.input.startIndex, ctx.input.maxRows);
    let client = new Client({ token: ctx.auth.token });
    let contacts = await client.getSegmentContacts(ctx.input.segmentId, {
      startindex: ctx.input.startIndex,
      maxrows: ctx.input.maxRows,
      orderByTs: ctx.input.orderByTs,
      asc: ctx.input.asc
    });

    let mapped = (Array.isArray(contacts) ? contacts : []).map((c: any) => ({
      contactId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      channels: c.channels,
      externalCustomerId: c.externalCustomerId
    }));

    return {
      output: {
        contacts: mapped,
        nextStartIndex:
          mapped.length === (ctx.input.maxRows ?? 500)
            ? (ctx.input.startIndex ?? 1) + mapped.length
            : undefined
      },
      message: `Retrieved **${mapped.length}** contact(s) from segment ${ctx.input.segmentId}.`
    };
  })
  .build();

export let updateSegmentMembership = SlateTool.create(spec, {
  name: 'Update Segment Membership',
  key: 'update_segment_membership',
  description: `Attach or detach contacts from a static segment. Provide either internal contact IDs or external customer IDs to identify the contacts.`,
  constraints: [
    'Only works for static (List-type) segments',
    'Maximum 500 contacts per request'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      segmentId: z.number().describe('Static segment ID. Call list_segments to discover IDs.'),
      action: z.enum(['attach', 'detach']).describe('Whether to attach or detach contacts'),
      contacts: z
        .array(
          z.object({
            contactId: z.number().optional().describe('eSputnik internal contact ID'),
            externalCustomerId: z.string().optional().describe('External customer ID')
          })
        )
        .min(1)
        .max(500)
        .describe('Contacts to attach or detach')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.contacts.some(
        contact => contact.contactId === undefined && !contact.externalCustomerId
      )
    ) {
      throw createApiServiceError(
        'Each contact must include contactId or externalCustomerId. No request was sent.'
      );
    }
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'attach') {
      await client.attachContactsToSegment(ctx.input.segmentId, ctx.input.contacts);
    } else {
      await client.detachContactsFromSegment(ctx.input.segmentId, ctx.input.contacts);
    }

    let actionWord = ctx.input.action === 'attach' ? 'attached to' : 'detached from';

    return {
      output: { success: true },
      message: `**${ctx.input.contacts.length}** contact(s) ${actionWord} segment ${ctx.input.segmentId}.`
    };
  })
  .build();
