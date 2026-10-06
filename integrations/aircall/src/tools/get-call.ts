import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { email, exactId, fail, id, mapCall, native, text, timestamp } from '../lib/contracts';
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
      callIdExact: z
        .string()
        .optional()
        .describe('Exact decimal Int64 ID from list_calls; supply instead of callId'),
      callId: z.number().optional().describe('The ID of the call to retrieve')
    })
  )
  .output(
    z.object({
      callIdExact: z
        .string()
        .optional()
        .describe('Exact decimal Int64 ID from list_calls; supply instead of callId'),
      callId: z.number().optional().describe('Unique call identifier'),
      directLink: z.string().nullable().describe('Native direct API permalink for the call'),
      direction: z.string().describe('Call direction (inbound or outbound)'),
      status: z.string().describe('Call status (initial, answered, done)'),
      rawDigits: z.string().describe('Phone number in E.164 format or "anonymous"'),
      startedAt: z.number().nullable().describe('Call start time as UNIX timestamp'),
      answeredAt: z.number().nullable().describe('Call answer time as UNIX timestamp'),
      endedAt: z.number().nullable().describe('Call end time as UNIX timestamp'),
      duration: z.number().nullable().describe('Call duration in seconds'),
      recording: z.string().nullable().describe('Recording URL (valid for one hour)'),
      voicemail: z.string().nullable().describe('Voicemail URL (valid for one hour)'),
      archived: z.boolean().optional().describe('Whether the call is archived'),
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
    const callIdExact = exactId(ctx.input.callId, ctx.input.callIdExact),
      call = await new Client(ctx.auth).getCall(callIdExact, { fetchContact: true }),
      base = mapCall(call);
    const user = (v: unknown) => {
      if (v == null) return null;
      const u = native(v, 'user');
      return { userId: id(u.id), name: text(u.name, 'Native user name') };
    };
    const n = call.number == null ? undefined : native(call.number, 'number'),
      c = call.contact == null ? undefined : native(call.contact, 'contact');
    if (!Array.isArray(call.comments))
      fail('Aircall omitted native comments.', 'aircall_receipt');
    const comments = call.comments.map(v => {
      const item = native(v, 'comment');
      const posted = timestamp(item.posted_at);
      return {
        commentId: id(item.id),
        content: text(item.content, 'Native comment'),
        postedAt: posted === undefined ? null : Date.parse(posted) / 1000
      };
    });
    const participants = call.conference_participants ?? call.participants;
    if (participants !== undefined && !Array.isArray(participants))
      fail('Aircall returned invalid conference participants.', 'aircall_receipt');
    return {
      output: {
        ...base,
        directLink:
          call.direct_link == null ? null : text(call.direct_link, 'Native API permalink'),
        cost: call.cost == null ? null : text(call.cost, 'Legacy cost'),
        user:
          call.user == null
            ? null
            : { ...user(call.user)!, email: email(native(call.user, 'user').email) },
        number: n
          ? {
              numberId: id(n.id),
              digits: text(n.digits, 'Native number'),
              name: n.name == null ? null : text(n.name, 'Native number name'),
              country: n.country == null ? null : text(n.country, 'Native country')
            }
          : null,
        contact: c
          ? {
              contactId: id(c.id),
              name: c.name == null ? null : text(c.name, 'Native contact name'),
              companyName:
                c.company_name == null ? null : text(c.company_name, 'Native company name')
            }
          : null,
        assignedTo: user(call.assigned_to),
        transferredBy: call.transferred_by ?? null,
        transferredTo: call.transferred_to ?? null,
        comments,
        participants: participants ?? []
      },
      message: `Retrieved exact call ${callIdExact}. Direct media URLs expire after one hour; archive is a legacy flag, not deletion.`
    };
  })
  .build();
