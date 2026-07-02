import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let manageInvitation = SlateTool.create(spec, {
  name: 'Manage Invitation',
  key: 'manage_invitation',
  description: `Create, list, or delete invitations for a consortium. Invitations allow you to invite external organizations to join your blockchain network.
When an invitation is accepted, a new membership is created for the invited organization.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'delete']).describe('Action to perform'),
      consortiumId: z.string().describe('Consortium ID'),
      invitationId: z.string().optional().describe('Invitation ID (required for delete)'),
      orgName: z
        .string()
        .optional()
        .describe('Organization name to invite (required for create)'),
      email: z
        .string()
        .optional()
        .describe('Email address of the invitee (required for create)')
    })
  )
  .output(
    z.object({
      invitations: z
        .array(
          z.object({
            invitationId: z.string().describe('Invitation ID'),
            orgName: z.string().optional().describe('Invited organization name'),
            email: z.string().optional().describe('Invitee email'),
            state: z.string().optional().describe('Invitation state'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of invitations (for list action)'),
      invitationId: z.string().optional().describe('Invitation ID'),
      orgName: z.string().optional().describe('Invited organization name'),
      email: z.string().optional().describe('Invitee email'),
      state: z.string().optional().describe('Invitation state'),
      deleted: z.boolean().optional().describe('Whether the invitation was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'list') {
      let invitations = await client.listInvitations(ctx.input.consortiumId);
      let mapped = invitations.map((i: any) => ({
        invitationId: i._id,
        orgName: i.org_name || undefined,
        email: i.email || undefined,
        state: i.state || undefined,
        createdAt: i.created_at || undefined
      }));

      return {
        output: { invitations: mapped },
        message: `Found **${mapped.length}** invitation(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.orgName) throw new Error('Organization name is required');
      if (!ctx.input.email) throw new Error('Email address is required');

      let result = await client.createInvitation(ctx.input.consortiumId, {
        org_name: ctx.input.orgName,
        email: ctx.input.email
      });

      return {
        output: {
          invitationId: result._id,
          orgName: result.org_name,
          email: result.email,
          state: result.state
        },
        message: `Sent invitation to **${result.org_name}** (${result.email}).`
      };
    }

    // delete
    if (!ctx.input.invitationId) throw new Error('Invitation ID is required');
    await client.deleteInvitation(ctx.input.consortiumId, ctx.input.invitationId);
    return {
      output: {
        invitationId: ctx.input.invitationId,
        deleted: true
      },
      message: `Deleted invitation \`${ctx.input.invitationId}\`.`
    };
  })
  .build();
