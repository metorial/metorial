import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let interactionSchema = z.object({
  interactionId: z.number().describe('Unique identifier of the interaction'),
  type: z.number().describe('Interaction type (0=meeting, 1=call, 2=chat message, 3=email)'),
  subject: z.string().nullable().describe('Subject line (for emails)'),
  body: z.string().nullable().describe('Body text'),
  date: z.string().nullable().describe('When the interaction occurred'),
  personIds: z.array(z.number()).describe('IDs of persons involved'),
  createdAt: z.string().nullable().describe('Record creation timestamp')
});

export let getInteractions = SlateTool.create(spec, {
  name: 'Get Interactions',
  key: 'get_interactions',
  description: `Retrieve interaction metadata from Affinity for one external person, organization or opportunity, one type and a date range of no more than one year. Email bodies may not be returned.

**Interaction types:**
- **0** = Meeting
- **1** = Call
- **2** = Chat message
- **3** = Email`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().optional().describe('Filter interactions involving this person'),
      organizationId: z
        .number()
        .optional()
        .describe('Filter interactions involving this organization'),
      opportunityId: z
        .number()
        .optional()
        .describe('Filter interactions related to this opportunity'),
      type: z
        .number()
        .optional()
        .describe('Required at invocation: 0=meeting, 1=call, 2=chat, 3=email'),
      startTime: z
        .string()
        .optional()
        .describe('Required at invocation: range start in ISO 8601.'),
      endTime: z
        .string()
        .optional()
        .describe(
          'Required at invocation: range end in ISO 8601, after startTime and no more than one year later.'
        ),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      interactions: z.array(interactionSchema).describe('List of interactions'),
      nextPageToken: z.string().nullable().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.getInteractions({
      personId: ctx.input.personId,
      organizationId: ctx.input.organizationId,
      opportunityId: ctx.input.opportunityId,
      type: ctx.input.type,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let interactions = (result.interactions ?? result ?? []).map(i => ({
      interactionId: i.id,
      type: i.type,
      subject: i.subject ?? i.title ?? null,
      body: i.body ?? null,
      date: i.date ?? i.start_time ?? null,
      personIds: i.person_ids ?? [
        ...new Set([
          ...(i.persons ?? []).map((person: { id: number }) => person.id),
          ...(i.from ? [i.from.id] : []),
          ...(i.to ?? []).map((person: { id: number }) => person.id),
          ...(i.cc ?? []).map((person: { id: number }) => person.id)
        ])
      ],
      createdAt: i.created_at ?? null
    }));

    return {
      output: {
        interactions,
        nextPageToken: result.next_page_token ?? null
      },
      message: `Retrieved **${interactions.length}** interaction(s).`
    };
  })
  .build();
