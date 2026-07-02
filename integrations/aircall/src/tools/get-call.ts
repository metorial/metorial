import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCall = SlateTool.create(spec, {
  name: 'Get Call',
  key: 'get_call',
  description: `Retrieve detailed information about a specific call including participants, recording URLs, comments, tags, transfer details, and IVR selections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      callId: z.number().describe('The ID of the call to retrieve')
    })
  )
  .output(
    z.object({
      callId: z.number().describe('Unique call identifier'),
      directLink: z
        .string()
        .nullable()
        .describe('Direct link to the call in Aircall dashboard'),
      direction: z.string().describe('Call direction (inbound or outbound)'),
      status: z.string().describe('Call status (initial, answered, done)'),
      rawDigits: z.string().describe('Phone number in E.164 format or "anonymous"'),
      startedAt: z.number().nullable().describe('Call start time as UNIX timestamp'),
      answeredAt: z.number().nullable().describe('Call answer time as UNIX timestamp'),
      endedAt: z.number().nullable().describe('Call end time as UNIX timestamp'),
      duration: z.number().nullable().describe('Call duration in seconds'),
      recording: z.string().nullable().describe('Recording URL (valid for 10 minutes)'),
      voicemail: z.string().nullable().describe('Voicemail URL (valid for 10 minutes)'),
      archived: z.boolean().describe('Whether the call is archived'),
      missedCallReason: z.string().nullable().describe('Reason the call was missed'),
      cost: z.string().nullable().describe('Call cost'),
      user: z
        .object({
          userId: z.number(),
          name: z.string(),
          email: z.string()
        })
        .nullable()
        .describe('User who handled the call'),
      number: z
        .object({
          numberId: z.number(),
          digits: z.string(),
          name: z.string().nullable(),
          country: z.string().nullable()
        })
        .nullable()
        .describe('Aircall number used'),
      contact: z
        .object({
          contactId: z.number(),
          name: z.string().nullable(),
          companyName: z.string().nullable()
        })
        .nullable()
        .describe('Associated contact'),
      assignedTo: z
        .object({
          userId: z.number(),
          name: z.string()
        })
        .nullable()
        .describe('User the call is assigned to'),
      transferredBy: z.any().nullable().describe('User who transferred the call'),
      transferredTo: z.any().nullable().describe('User/team the call was transferred to'),
      tags: z
        .array(
          z.object({
            tagId: z.number(),
            tagName: z.string()
          })
        )
        .describe('Tags applied to the call'),
      comments: z
        .array(
          z.object({
            commentId: z.number(),
            content: z.string(),
            postedAt: z.number().nullable()
          })
        )
        .describe('Comments on the call'),
      participants: z.array(z.any()).describe('Call participants')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let call = await client.getCall(ctx.input.callId, { fetchContact: true });

    let output = {
      callId: call.id,
      directLink: call.direct_link ?? null,
      direction: call.direction,
      status: call.status,
      rawDigits: call.raw_digits || '',
      startedAt: call.started_at ?? null,
      answeredAt: call.answered_at ?? null,
      endedAt: call.ended_at ?? null,
      duration: call.duration ?? null,
      recording: call.recording ?? null,
      voicemail: call.voicemail ?? null,
      archived: call.archived ?? false,
      missedCallReason: call.missed_call_reason ?? null,
      cost: call.cost ?? null,
      user: call.user
        ? {
            userId: call.user.id,
            name: call.user.name,
            email: call.user.email
          }
        : null,
      number: call.number
        ? {
            numberId: call.number.id,
            digits: call.number.digits,
            name: call.number.name ?? null,
            country: call.number.country ?? null
          }
        : null,
      contact: call.contact
        ? {
            contactId: call.contact.id,
            name: call.contact.name ?? null,
            companyName: call.contact.company_name ?? null
          }
        : null,
      assignedTo: call.assigned_to
        ? {
            userId: call.assigned_to.id,
            name: call.assigned_to.name
          }
        : null,
      transferredBy: call.transferred_by ?? null,
      transferredTo: call.transferred_to ?? null,
      tags: (call.tags || []).map((t: any) => ({
        tagId: t.id,
        tagName: t.name
      })),
      comments: (call.comments || []).map((c: any) => ({
        commentId: c.id,
        content: c.content,
        postedAt: c.posted_at ?? null
      })),
      participants: call.participants || []
    };

    let statusText = call.status === 'done' ? 'completed' : call.status;

    return {
      output,
      message: `Retrieved ${call.direction} call **#${call.id}** — status: ${statusText}, duration: ${call.duration ?? 0}s.`
    };
  })
  .build();
