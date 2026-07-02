import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let cadenceOutputSchema = z.object({
  cadenceId: z.number().describe('SalesLoft cadence ID'),
  name: z.string().nullable().optional().describe('Cadence name'),
  cadenceState: z.string().nullable().optional().describe('Current state of the cadence'),
  currentState: z.string().nullable().optional().describe('Current state indicator'),
  teamCadence: z.boolean().nullable().optional().describe('Whether this is a team cadence'),
  shared: z.boolean().nullable().optional().describe('Whether this cadence is shared'),
  draft: z.boolean().nullable().optional().describe('Whether this cadence is a draft'),
  cadenceFrameworkId: z.number().nullable().optional().describe('Framework ID if applicable'),
  ownerId: z.number().nullable().optional().describe('Owner user ID'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  totalPeople: z.number().nullable().optional().describe('Total people in this cadence'),
  countsPeopleTouched: z.number().nullable().optional().describe('Number of people touched'),
  tags: z.array(z.string()).nullable().optional().describe('Tags applied to cadence')
});

let mapCadence = (raw: any) => ({
  cadenceId: raw.id,
  name: raw.name,
  cadenceState: raw.cadence_state,
  currentState: raw.current_state,
  teamCadence: raw.team_cadence,
  shared: raw.shared,
  draft: raw.draft,
  cadenceFrameworkId: raw.cadence_framework_id,
  ownerId: raw.owner?.id ?? null,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  totalPeople: raw.counts?.people_added ?? null,
  countsPeopleTouched: raw.counts?.target_people ?? null,
  tags: raw.tags
});

let paginationOutputSchema = z.object({
  perPage: z.number().describe('Results per page'),
  currentPage: z.number().describe('Current page number'),
  nextPage: z.number().nullable().describe('Next page number'),
  prevPage: z.number().nullable().describe('Previous page number')
});

export let listCadences = SlateTool.create(spec, {
  name: 'List Cadences',
  key: 'list_cadences',
  description: `List cadences in SalesLoft. Cadences are multi-step communication sequences (e.g., email + call sequences). Filter by team or personal cadences. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (1-100, default: 25)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      teamCadence: z
        .boolean()
        .optional()
        .describe('Filter to team cadences only (true) or personal (false)')
    })
  )
  .output(
    z.object({
      cadences: z.array(cadenceOutputSchema).describe('List of cadences'),
      paging: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCadences(ctx.input);
    let cadences = result.data.map(mapCadence);

    return {
      output: {
        cadences,
        paging: result.metadata.paging
      },
      message: `Found **${cadences.length}** cadences (page ${result.metadata.paging.currentPage}).`
    };
  })
  .build();

export let getCadence = SlateTool.create(spec, {
  name: 'Get Cadence',
  key: 'get_cadence',
  description: `Fetch a single cadence from SalesLoft by ID. Returns cadence details including name, state, ownership, and people counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cadenceId: z.number().describe('ID of the cadence to fetch')
    })
  )
  .output(cadenceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let cadence = await client.getCadence(ctx.input.cadenceId);
    let output = mapCadence(cadence);

    return {
      output,
      message: `Fetched cadence **${output.name}** (ID: ${output.cadenceId}).`
    };
  })
  .build();

export let addPersonToCadence = SlateTool.create(spec, {
  name: 'Add Person to Cadence',
  key: 'add_person_to_cadence',
  description: `Add a person to a cadence in SalesLoft, creating a cadence membership. The person will begin receiving touches defined by the cadence steps.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to add'),
      cadenceId: z.number().describe('ID of the cadence to add the person to'),
      userId: z
        .number()
        .optional()
        .describe('ID of the user executing the cadence (defaults to authenticated user)')
    })
  )
  .output(
    z.object({
      membershipId: z.number().describe('Cadence membership ID'),
      personId: z.number().describe('Person ID'),
      cadenceId: z.number().describe('Cadence ID'),
      currentlyOnCadence: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether person is currently on cadence'),
      createdAt: z.string().nullable().optional().describe('Membership creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let membership = await client.addPersonToCadence(
      ctx.input.personId,
      ctx.input.cadenceId,
      ctx.input.userId
    );

    return {
      output: {
        membershipId: membership.id,
        personId: membership.person?.id ?? ctx.input.personId,
        cadenceId: membership.cadence?.id ?? ctx.input.cadenceId,
        currentlyOnCadence: membership.currently_on_cadence,
        createdAt: membership.created_at
      },
      message: `Added person ${ctx.input.personId} to cadence ${ctx.input.cadenceId} (membership ID: ${membership.id}).`
    };
  })
  .build();

export let removePersonFromCadence = SlateTool.create(spec, {
  name: 'Remove Person from Cadence',
  key: 'remove_person_from_cadence',
  description: `Remove a person from a cadence by deleting the cadence membership. The person will stop receiving touches from this cadence.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      membershipId: z.number().describe('Cadence membership ID to remove')
    })
  )
  .output(
    z.object({
      membershipId: z.number().describe('ID of the removed membership'),
      removed: z.boolean().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.removeCadenceMembership(ctx.input.membershipId);

    return {
      output: {
        membershipId: ctx.input.membershipId,
        removed: true
      },
      message: `Removed cadence membership ${ctx.input.membershipId}.`
    };
  })
  .build();
