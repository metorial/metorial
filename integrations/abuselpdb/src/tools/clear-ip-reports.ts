import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let clearIpReports = SlateTool.create(spec, {
  name: 'Clear IP Reports',
  key: 'clear_ip_reports',
  description: `Delete all abuse reports that **your account** has previously submitted for a specific IP address. This does not affect reports submitted by other users.

Use this to retract mistaken or outdated reports for an IP address.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('IPv4 or IPv6 address to clear your reports for')
    })
  )
  .output(
    z.object({
      numReportsDeleted: z.number().describe('Number of reports that were deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.clearAddress({
      ipAddress: ctx.input.ipAddress
    });

    let data = result.data;

    return {
      output: {
        numReportsDeleted: data.numReportsDeleted ?? 0
      },
      message: `Cleared **${data.numReportsDeleted ?? 0}** of your reports for **${ctx.input.ipAddress}**.`
    };
  })
  .build();
