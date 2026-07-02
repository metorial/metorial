import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let concurrencyDetail = z.object({
  allowed: z
    .object({
      vms: z.number().optional().describe('Allowed virtual machine slots'),
      macVms: z.number().optional().describe('Allowed Mac virtual machine slots'),
      rds: z.number().optional().describe('Allowed real device slots')
    })
    .optional(),
  current: z
    .object({
      vms: z.number().optional().describe('Currently used virtual machine slots'),
      macVms: z.number().optional().describe('Currently used Mac VM slots'),
      rds: z.number().optional().describe('Currently used real device slots')
    })
    .optional()
});

export let getUserConcurrency = SlateTool.create(spec, {
  name: 'Get User Concurrency',
  key: 'get_user_concurrency',
  description: `Check current and allowed concurrency limits for your account. Shows VM, Mac VM, and real device slot usage at both the organization and team level.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      username: z
        .string()
        .optional()
        .describe('Username to check concurrency for (defaults to the authenticated user)')
    })
  )
  .output(
    z.object({
      organization: concurrencyDetail.describe('Organization-level concurrency'),
      team: concurrencyDetail.describe('Team-level concurrency')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let username = ctx.input.username ?? ctx.auth.username;
    let result = await client.getUserConcurrency(username);

    let org = result.concurrency?.organization ?? result.organization ?? {};
    let team = result.concurrency?.team ?? result.team ?? {};

    let mapConcurrency = (data: any) => ({
      allowed: data.allowed
        ? {
            vms: data.allowed.vms,
            macVms: data.allowed.mac_vms,
            rds: data.allowed.rds
          }
        : undefined,
      current: data.current
        ? {
            vms: data.current.vms,
            macVms: data.current.mac_vms,
            rds: data.current.rds
          }
        : undefined
    });

    return {
      output: {
        organization: mapConcurrency(org),
        team: mapConcurrency(team)
      },
      message: `Concurrency for **${username}**: Org VMs ${org.current?.vms ?? 0}/${org.allowed?.vms ?? 0}, Team VMs ${team.current?.vms ?? 0}/${team.allowed?.vms ?? 0}.`
    };
  })
  .build();
