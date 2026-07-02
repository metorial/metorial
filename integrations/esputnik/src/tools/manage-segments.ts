import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `Retrieve all segments (groups) in your eSputnik account. Returns each segment's ID, name, and type (Static or Dynamic).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
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
        .describe('All segments in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let segments = await client.getSegments();

    let mapped = (Array.isArray(segments) ? segments : []).map((s: any) => ({
      segmentId: s.id,
      name: s.name,
      type: s.type
    }));

    return {
      output: { segments: mapped },
      message: `Found **${mapped.length}** segment(s).`
    };
  })
  .build();

export let getSegmentContacts = SlateTool.create(spec, {
  name: 'Get Segment Contacts',
  key: 'get_segment_contacts',
  description: `Retrieve all contacts belonging to a specific segment. Provide the segment ID to get its members.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.number().describe('ID of the segment to retrieve contacts from')
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
        .describe('Contacts in the segment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contacts = await client.getSegmentContacts(ctx.input.segmentId);

    let mapped = (Array.isArray(contacts) ? contacts : []).map((c: any) => ({
      contactId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      channels: c.channels,
      externalCustomerId: c.externalCustomerId
    }));

    return {
      output: { contacts: mapped },
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
      segmentId: z.number().describe('ID of the static segment'),
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
