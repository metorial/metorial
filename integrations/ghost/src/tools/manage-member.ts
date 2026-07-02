import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let memberOutputSchema = z.object({
  memberId: z.string().describe('Unique member ID'),
  uuid: z.string().describe('Member UUID'),
  email: z.string().describe('Member email address'),
  name: z.string().nullable().describe('Member name'),
  note: z.string().nullable().describe('Internal note'),
  status: z.string().describe('Member status (free, paid, comped)'),
  avatarImage: z.string().nullable().describe('Avatar image URL'),
  emailCount: z.number().describe('Total emails sent'),
  emailOpenedCount: z.number().describe('Number of emails opened'),
  lastSeenAt: z.string().nullable().describe('Last activity timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageMember = SlateTool.create(spec, {
  name: 'Manage Member',
  key: 'manage_member',
  description: `Create, read, update, or delete a member (subscriber) on your Ghost site. Members can be free or paid subscribers with associated labels and newsletter subscriptions.`,
  instructions: [
    'For **creating**: set `action` to `"create"` and provide at least an `email`.',
    'For **reading**: set `action` to `"read"` and provide `memberId`.',
    'For **updating**: set `action` to `"update"`, provide `memberId` plus fields to change.',
    'For **deleting**: set `action` to `"delete"` and provide `memberId`.',
    'You can assign labels and newsletter subscriptions when creating or updating.'
  ],
  constraints: [
    'The `comped` field grants free access to paid content without a Stripe subscription.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'read', 'update', 'delete']).describe('Operation to perform'),
      memberId: z.string().optional().describe('Member ID (required for read/update/delete)'),
      email: z.string().optional().describe('Member email address'),
      name: z.string().optional().describe('Member name'),
      note: z.string().optional().describe('Internal note about the member'),
      labels: z
        .array(
          z.object({
            name: z.string().describe('Label name')
          })
        )
        .optional()
        .describe('Labels to assign to the member'),
      newsletters: z
        .array(
          z.object({
            newsletterId: z.string().describe('Newsletter ID to subscribe to')
          })
        )
        .optional()
        .describe('Newsletters to subscribe the member to'),
      comped: z
        .boolean()
        .optional()
        .describe('Whether the member has complimentary premium access')
    })
  )
  .output(memberOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

    let { action } = ctx.input;

    if (action === 'read') {
      if (!ctx.input.memberId) throw new Error('memberId is required for reading a member');
      let result = await client.readMember(ctx.input.memberId, {
        include: 'newsletters,labels'
      });
      let m = result.members[0];
      return {
        output: mapMember(m),
        message: `Retrieved member **${m.email}** (${m.status}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.memberId) throw new Error('memberId is required for deleting a member');
      await client.deleteMember(ctx.input.memberId);
      return {
        output: {
          memberId: ctx.input.memberId,
          uuid: '',
          email: '',
          name: null,
          note: null,
          status: 'deleted',
          avatarImage: null,
          emailCount: 0,
          emailOpenedCount: 0,
          lastSeenAt: null,
          createdAt: '',
          updatedAt: ''
        },
        message: `Deleted member \`${ctx.input.memberId}\`.`
      };
    }

    let memberData: Record<string, any> = {};
    if (ctx.input.email !== undefined) memberData.email = ctx.input.email;
    if (ctx.input.name !== undefined) memberData.name = ctx.input.name;
    if (ctx.input.note !== undefined) memberData.note = ctx.input.note;
    if (ctx.input.comped !== undefined) memberData.comped = ctx.input.comped;
    if (ctx.input.labels) memberData.labels = ctx.input.labels;
    if (ctx.input.newsletters) {
      memberData.newsletters = ctx.input.newsletters.map(n => ({ id: n.newsletterId }));
    }

    if (action === 'create') {
      if (!ctx.input.email) throw new Error('email is required for creating a member');
      let result = await client.createMember(memberData);
      let m = result.members[0];
      return { output: mapMember(m), message: `Created member **${m.email}** (${m.status}).` };
    }

    if (action === 'update') {
      if (!ctx.input.memberId) throw new Error('memberId is required for updating a member');
      let result = await client.updateMember(ctx.input.memberId, memberData);
      let m = result.members[0];
      return { output: mapMember(m), message: `Updated member **${m.email}** (${m.status}).` };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapMember = (m: any) => ({
  memberId: m.id,
  uuid: m.uuid,
  email: m.email,
  name: m.name ?? null,
  note: m.note ?? null,
  status: m.status,
  avatarImage: m.avatar_image ?? null,
  emailCount: m.email_count ?? 0,
  emailOpenedCount: m.email_opened_count ?? 0,
  lastSeenAt: m.last_seen_at ?? null,
  createdAt: m.created_at,
  updatedAt: m.updated_at
});
