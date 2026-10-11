import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let suppressionOriginSchema = z.enum(['bounce', 'complaint', 'manual']);

let suppressionOutputSchema = z.object({
  suppressionId: z.string().describe('Suppression ID.'),
  email: z.string().optional().describe('Suppressed email address.'),
  origin: z
    .string()
    .optional()
    .describe('Why the address is suppressed: bounce, complaint, or manual.'),
  sourceEmailId: z
    .string()
    .optional()
    .nullable()
    .describe('ID of the email that caused the suppression. Null for manual suppressions.'),
  createdAt: z.string().optional().describe('When the address was suppressed.')
});

let mapSuppression = (suppression: any) => ({
  suppressionId: suppression.id,
  email: suppression.email,
  origin: suppression.origin,
  sourceEmailId: suppression.source_id,
  createdAt: suppression.created_at
});

export let listSuppressions = SlateTool.create(spec, {
  name: 'List Suppressions',
  key: 'list_suppressions',
  description: `List email addresses on the Resend suppression list. Resend does not deliver to suppressed addresses, which are added after hard bounces, spam complaints, or manually.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      origin: suppressionOriginSchema
        .optional()
        .describe('Only return suppressions with this origin.'),
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      suppressions: z.array(suppressionOutputSchema).describe('Suppressed addresses.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSuppressions({
      origin: ctx.input.origin,
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });
    let suppressions = (result.data || []).map(mapSuppression);

    return {
      output: {
        suppressions,
        hasMore: result.has_more ?? false
      },
      message: `Found **${suppressions.length}** suppressed address(es).`
    };
  })
  .build();

export let addSuppression = SlateTool.create(spec, {
  name: 'Add Suppression',
  key: 'add_suppression',
  description: `Add an email address to the Resend suppression list so Resend stops delivering to it, for example after a do-not-email request.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to suppress.')
    })
  )
  .output(
    z.object({
      suppressionId: z.string().describe('ID of the created suppression.'),
      email: z.string().describe('Suppressed email address.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.addSuppression(ctx.input.email);

    return {
      output: {
        suppressionId: result.id,
        email: ctx.input.email
      },
      message: `**${ctx.input.email}** added to the suppression list with ID \`${result.id}\`.`
    };
  })
  .build();

export let getSuppression = SlateTool.create(spec, {
  name: 'Get Suppression',
  key: 'get_suppression',
  description: `Check whether an email address is on the Resend suppression list, by suppression ID or email address. Returns the origin and the email that caused it.`,
  instructions: [
    'A not-found error means the address is not suppressed and Resend will attempt delivery.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      suppressionIdOrEmail: z.string().describe('Suppression ID or suppressed email address.')
    })
  )
  .output(suppressionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let suppression = await client.getSuppression(ctx.input.suppressionIdOrEmail);

    return {
      output: mapSuppression(suppression),
      message: `**${suppression.email ?? suppression.id}** is suppressed (origin: **${suppression.origin ?? 'unknown'}**).`
    };
  })
  .build();

export let removeSuppression = SlateTool.create(spec, {
  name: 'Remove Suppression',
  key: 'remove_suppression',
  description: `Remove an email address from the Resend suppression list, by suppression ID or email address, so Resend will deliver to it again.`,
  instructions: [
    'Only remove a suppression when the underlying bounce or complaint has been resolved; sending to bad addresses hurts deliverability.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      suppressionIdOrEmail: z
        .string()
        .describe('Suppression ID or suppressed email address to remove.')
    })
  )
  .output(
    z.object({
      suppressionId: z.string().describe('ID of the removed suppression.'),
      deleted: z.boolean().describe('Whether the suppression was removed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.removeSuppression(ctx.input.suppressionIdOrEmail);

    return {
      output: {
        suppressionId: result.id,
        deleted: result.deleted ?? true
      },
      message: `**${ctx.input.suppressionIdOrEmail}** removed from the suppression list.`
    };
  })
  .build();
