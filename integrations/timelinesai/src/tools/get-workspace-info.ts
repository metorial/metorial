import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkspaceInfo = SlateTool.create(spec, {
  name: 'Get Workspace Info',
  key: 'get_workspace_info',
  description: `Retrieve workspace teammates and usage quotas. Returns team members with roles, emails, and assigned WhatsApp accounts, as well as seat, messaging, and API call quota usage.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeQuotas: z
        .boolean()
        .optional()
        .describe('Also fetch workspace usage quotas (seats, messaging, API calls)')
    })
  )
  .output(
    z.object({
      teammates: z
        .array(
          z.object({
            userId: z.number().describe('Unique user identifier'),
            displayName: z.string().optional().describe('User display name'),
            role: z.string().optional().describe('User role (e.g., owner, member)'),
            email: z.string().optional().describe('User email'),
            status: z.string().optional().describe('User status (e.g., active)'),
            createdAt: z.string().optional().describe('Account creation timestamp')
          })
        )
        .describe('Workspace team members'),
      quotas: z
        .object({
          seats: z
            .object({
              total: z.number().describe('Total seats'),
              used: z.number().describe('Used seats')
            })
            .optional()
            .describe('Seat quota'),
          messagingQuota: z
            .object({
              total: z.number().describe('Total messaging credits'),
              used: z.number().describe('Used messaging credits')
            })
            .optional()
            .describe('Messaging quota'),
          apiCallsQuota: z
            .object({
              total: z.number().describe('Total API calls'),
              used: z.number().describe('Used API calls')
            })
            .optional()
            .describe('API calls quota')
        })
        .optional()
        .describe('Workspace usage quotas')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let teammatesResult = await client.getWorkspaceTeammates();
    let teammates = (teammatesResult?.data?.teammates || []).map((t: any) => ({
      userId: t.user_id,
      displayName: t.display_name,
      role: t.role,
      email: t.email,
      status: t.status,
      createdAt: t.created_at
    }));

    let quotas: any;
    if (ctx.input.includeQuotas) {
      let quotaResult = await client.getWorkspaceQuotas();
      let q = quotaResult?.data;
      quotas = {
        seats: q?.seats ? { total: q.seats.total, used: q.seats.used } : undefined,
        messagingQuota: q?.messaging_quota
          ? { total: q.messaging_quota.total, used: q.messaging_quota.used }
          : undefined,
        apiCallsQuota: q?.api_calls_quota
          ? { total: q.api_calls_quota.total, used: q.api_calls_quota.used }
          : undefined
      };
    }

    return {
      output: { teammates, quotas },
      message: `Workspace has **${teammates.length}** teammate(s).${quotas ? ` Messaging: ${quotas.messagingQuota?.used}/${quotas.messagingQuota?.total} credits used.` : ''}`
    };
  })
  .build();
