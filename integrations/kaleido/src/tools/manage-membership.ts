import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let manageMembership = SlateTool.create(spec, {
  name: 'Manage Membership',
  key: 'manage_membership',
  description: `Create, list, retrieve, or delete memberships within a consortium. Memberships represent organizations participating in a blockchain network.
Each membership can own nodes, services, and application credentials within environments.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Action to perform'),
      consortiumId: z.string().describe('Consortium ID'),
      membershipId: z.string().optional().describe('Membership ID (required for get, delete)'),
      orgName: z.string().optional().describe('Organization name (required for create)')
    })
  )
  .output(
    z.object({
      memberships: z
        .array(
          z.object({
            membershipId: z.string().describe('Membership ID'),
            orgName: z.string().describe('Organization name'),
            state: z.string().optional().describe('Membership state'),
            orgId: z.string().optional().describe('Organization ID'),
            verificationProof: z.string().optional().describe('Verification proof'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of memberships (for list action)'),
      membershipId: z.string().optional().describe('Membership ID'),
      orgName: z.string().optional().describe('Organization name'),
      state: z.string().optional().describe('Membership state'),
      orgId: z.string().optional().describe('Organization ID'),
      deleted: z.boolean().optional().describe('Whether the membership was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'list') {
      let memberships = await client.listMemberships(ctx.input.consortiumId);
      let mapped = memberships.map((m: any) => ({
        membershipId: m._id,
        orgName: m.org_name,
        state: m.state || undefined,
        orgId: m.org_id || undefined,
        verificationProof: m.verification_proof || undefined,
        createdAt: m.created_at || undefined
      }));

      return {
        output: { memberships: mapped },
        message: `Found **${mapped.length}** membership(s).${mapped.length > 0 ? ` ${mapped.map(m => `**${m.orgName}**`).join(', ')}` : ''}`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.orgName) throw new Error('Organization name is required');

      let result = await client.createMembership(ctx.input.consortiumId, {
        org_name: ctx.input.orgName
      });

      return {
        output: {
          membershipId: result._id,
          orgName: result.org_name,
          state: result.state,
          orgId: result.org_id
        },
        message: `Created membership **${result.org_name}** (\`${result._id}\`).`
      };
    }

    if (!ctx.input.membershipId) throw new Error('Membership ID is required');

    if (ctx.input.action === 'get') {
      let result = await client.getMembership(ctx.input.consortiumId, ctx.input.membershipId);
      return {
        output: {
          membershipId: result._id,
          orgName: result.org_name,
          state: result.state,
          orgId: result.org_id
        },
        message: `Membership **${result.org_name}** — state: ${result.state || 'unknown'}.`
      };
    }

    // delete
    await client.deleteMembership(ctx.input.consortiumId, ctx.input.membershipId);
    return {
      output: {
        membershipId: ctx.input.membershipId,
        deleted: true
      },
      message: `Deleted membership \`${ctx.input.membershipId}\`.`
    };
  })
  .build();
