import { SlateTool } from 'slates';
import { z } from 'zod';
import { SitesClient } from '../lib/client';
import { spec } from '../spec';

export let listGuests = SlateTool.create(spec, {
  name: 'List Guests',
  key: 'list_guests',
  description: `List all guest users for a site, including their email, role (viewer or editor), and invitation status. Requires a Sites API key (Enterprise plan).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Domain of the site'),
      limit: z.number().optional().describe('Maximum number of guests to return'),
      after: z.string().optional().describe('Pagination cursor for next page'),
      before: z.string().optional().describe('Pagination cursor for previous page')
    })
  )
  .output(
    z.object({
      guests: z
        .array(
          z.object({
            email: z.string().describe('Email address of the guest'),
            role: z.string().describe('Role assigned to the guest (viewer or editor)'),
            status: z.string().describe('Invitation status (accepted or invited)')
          })
        )
        .describe('List of guest users'),
      meta: z.record(z.string(), z.any()).optional().describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listGuests(ctx.input.siteId, {
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let guests = (result.guests ?? result ?? []).map((g: any) => ({
      email: g.email,
      role: g.role,
      status: g.status
    }));

    return {
      output: {
        guests,
        meta: result.meta
      },
      message: `Found **${guests.length}** guest(s) for site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let inviteGuest = SlateTool.create(spec, {
  name: 'Invite Guest',
  key: 'invite_guest',
  description: `Invite a guest user to access a site's analytics dashboard. Guests can be assigned a viewer or editor role. Requires a Sites API key (Enterprise plan).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Domain of the site'),
      email: z.string().describe('Email address of the guest to invite'),
      role: z
        .enum(['viewer', 'editor'])
        .describe('Role to assign: "viewer" for read-only access, "editor" for edit access')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email address of the invited guest'),
      role: z.string().describe('Assigned role'),
      status: z.string().describe('Invitation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.inviteGuest(ctx.input.siteId, ctx.input.email, ctx.input.role);

    return {
      output: {
        email: result.email,
        role: result.role,
        status: result.status
      },
      message: `Invited **${result.email}** as **${result.role}** for site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let removeGuest = SlateTool.create(spec, {
  name: 'Remove Guest',
  key: 'remove_guest',
  description: `Remove a guest user's access from a site. Requires a Sites API key (Enterprise plan).`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Domain of the site'),
      email: z.string().describe('Email address of the guest to remove')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the guest was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.removeGuest(ctx.input.siteId, ctx.input.email);

    return {
      output: {
        deleted: true
      },
      message: `Removed guest **${ctx.input.email}** from site **${ctx.input.siteId}**.`
    };
  })
  .build();
