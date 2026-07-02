import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Retrieve a single person record by ID, including their emails, organization associations, and optionally interaction dates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to retrieve'),
      withInteractionDates: z
        .boolean()
        .optional()
        .describe('Include first and last interaction dates')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('Unique identifier'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      primaryEmail: z.string().nullable().describe('Primary email address'),
      emails: z.array(z.string()).describe('All email addresses'),
      organizationIds: z.array(z.number()).describe('IDs of associated organizations'),
      listEntries: z
        .array(
          z.object({
            listEntryId: z.number().describe('List entry ID'),
            listId: z.number().describe('List ID'),
            creatorId: z.number().nullable().describe('ID of the user who added this entry'),
            createdAt: z.string().nullable().describe('When the entry was created')
          })
        )
        .optional()
        .describe('List entries this person belongs to'),
      interactionDates: z
        .object({
          firstEmail: z.string().nullable().optional(),
          lastEmail: z.string().nullable().optional(),
          firstEvent: z.string().nullable().optional(),
          lastEvent: z.string().nullable().optional()
        })
        .optional()
        .describe('Interaction date timestamps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let p = await client.getPerson(ctx.input.personId, {
      withInteractionDates: ctx.input.withInteractionDates
    });

    let listEntries = (p.list_entries ?? []).map((e: any) => ({
      listEntryId: e.id,
      listId: e.list_id,
      creatorId: e.creator_id ?? null,
      createdAt: e.created_at ?? null
    }));

    let output: any = {
      personId: p.id,
      firstName: p.first_name ?? null,
      lastName: p.last_name ?? null,
      primaryEmail: p.primary_email ?? null,
      emails: p.emails ?? [],
      organizationIds: p.organization_ids ?? [],
      listEntries
    };

    if (ctx.input.withInteractionDates) {
      output.interactionDates = {
        firstEmail: p.interaction_dates?.first_email_date ?? null,
        lastEmail: p.interaction_dates?.last_email_date ?? null,
        firstEvent: p.interaction_dates?.first_event_date ?? null,
        lastEvent: p.interaction_dates?.last_event_date ?? null
      };
    }

    return {
      output,
      message: `Retrieved person **${p.first_name ?? ''} ${p.last_name ?? ''}** (ID: ${p.id}).`
    };
  })
  .build();
