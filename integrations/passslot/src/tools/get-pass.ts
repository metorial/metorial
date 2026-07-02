import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPass = SlateTool.create(spec, {
  name: 'Get Pass',
  key: 'get_pass',
  description: `Retrieve detailed information about a specific pass, including its current placeholder values, status, distribution URL, and full pass JSON description.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      passTypeIdentifier: z
        .string()
        .describe('Pass type identifier (e.g., "pass.example.id1")'),
      serialNumber: z.string().describe('Unique serial number of the pass')
    })
  )
  .output(
    z.object({
      serialNumber: z.string().describe('Unique serial number of the pass'),
      passTypeIdentifier: z.string().describe('Pass type identifier'),
      distributionUrl: z.string().optional().describe('Short URL to download/share the pass'),
      values: z.record(z.string(), z.any()).optional().describe('Current placeholder values'),
      status: z.string().optional().describe('Current pass status'),
      passJson: z.any().optional().describe('Full Wallet pass JSON description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { passTypeIdentifier, serialNumber } = ctx.input;

    let [urlResult, values, statusResult, passJson] = await Promise.all([
      client.getPassUrl(passTypeIdentifier, serialNumber).catch(() => null),
      client.getPassValues(passTypeIdentifier, serialNumber).catch(() => null),
      client.getPassStatus(passTypeIdentifier, serialNumber).catch(() => null),
      client.getPassJson(passTypeIdentifier, serialNumber).catch(() => null)
    ]);

    return {
      output: {
        serialNumber,
        passTypeIdentifier,
        distributionUrl: urlResult?.url,
        values: values || undefined,
        status: statusResult?.status,
        passJson: passJson || undefined
      },
      message: `Retrieved pass **${serialNumber}**${statusResult ? ` (status: ${statusResult.status})` : ''}.`
    };
  })
  .build();
