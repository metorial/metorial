import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let teammateOutputSchema = z.object({
  teammateId: z.string(),
  email: z.string(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  isAdmin: z.boolean(),
  isAvailable: z.boolean(),
  isBlocked: z.boolean()
});

export let listTeammates = SlateTool.create(spec, {
  name: 'List Teammates',
  key: 'list_teammates',
  description: `List all teammates (users) in the Front company. Returns each teammate's profile including email, name, availability status, and admin role.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageToken: z.string().optional().describe('Pagination token'),
      limit: z.number().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      teammates: z.array(teammateOutputSchema),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTeammates({
      page_token: ctx.input.pageToken,
      limit: ctx.input.limit
    });

    let teammates = result._results.map(t => ({
      teammateId: t.id,
      email: t.email,
      username: t.username,
      firstName: t.first_name,
      lastName: t.last_name,
      isAdmin: t.is_admin,
      isAvailable: t.is_available,
      isBlocked: t.is_blocked
    }));

    return {
      output: { teammates, nextPageToken: result._pagination?.next || undefined },
      message: `Found **${teammates.length}** teammates.`
    };
  });

export let getTeammate = SlateTool.create(spec, {
  name: 'Get Teammate',
  key: 'get_teammate',
  description: `Retrieve detailed information about a specific teammate. You can use the teammate's email as an alias (e.g., alt:email:user@example.com).`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      teammateId: z
        .string()
        .describe('Teammate ID or email alias (alt:email:user@example.com)')
    })
  )
  .output(teammateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let teammate = await client.getTeammate(ctx.input.teammateId);

    return {
      output: {
        teammateId: teammate.id,
        email: teammate.email,
        username: teammate.username,
        firstName: teammate.first_name,
        lastName: teammate.last_name,
        isAdmin: teammate.is_admin,
        isAvailable: teammate.is_available,
        isBlocked: teammate.is_blocked
      },
      message: `Retrieved teammate **${teammate.first_name} ${teammate.last_name}** (${teammate.email}).`
    };
  });

export let updateTeammate = SlateTool.create(spec, {
  name: 'Update Teammate',
  key: 'update_teammate',
  description: `Update a teammate's profile or availability status. Can be used to toggle availability on/off.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      teammateId: z.string().describe('Teammate ID to update'),
      username: z.string().optional().describe('Updated username'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      isAvailable: z.boolean().optional().describe('Set teammate availability')
    })
  )
  .output(
    z.object({
      teammateId: z.string(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.updateTeammate(ctx.input.teammateId, {
      username: ctx.input.username,
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      is_available: ctx.input.isAvailable
    });

    return {
      output: { teammateId: ctx.input.teammateId, updated: true },
      message: `Updated teammate ${ctx.input.teammateId}.`
    };
  });
