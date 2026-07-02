import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let interactionSchema = z.object({
  interactionId: z.number().describe('Unique identifier of the interaction'),
  type: z
    .number()
    .describe('Interaction type (0=email, 1=event/meeting, 2=phone call, 3=chat message)'),
  subject: z.string().nullable().describe('Subject line (for emails)'),
  body: z.string().nullable().describe('Body text'),
  date: z.string().nullable().describe('When the interaction occurred'),
  personIds: z.array(z.number()).describe('IDs of persons involved'),
  createdAt: z.string().nullable().describe('Record creation timestamp')
});

export let getInteractions = SlateTool.create(spec, {
  name: 'Get Interactions',
  key: 'get_interactions',
  description: `Retrieve interaction records (emails, meetings, calls, chat messages) from Affinity. Filter by person, organization, opportunity, or interaction type.

**Interaction types:**
- **0** = Email
- **1** = Event/Meeting
- **2** = Phone call
- **3** = Chat message`,
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
        .describe('Filter by interaction type (0=email, 1=meeting, 2=call, 3=chat)'),
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
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let interactions = (result.interactions ?? result ?? []).map((i: any) => ({
      interactionId: i.id,
      type: i.type,
      subject: i.subject ?? null,
      body: i.body ?? null,
      date: i.date ?? null,
      personIds: i.person_ids ?? [],
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
