import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let performSingleCheck = SlateTool.create(spec, {
  name: 'Perform Single Check',
  key: 'perform_single_check',
  description: `Performs a one-time ad-hoc probe check against a host without creating a persistent check. Useful for quick availability tests and diagnostics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      hostname: z.string().describe('Target hostname or IP to check'),
      type: z
        .enum(['http', 'httpcustom', 'tcp', 'udp', 'ping', 'dns', 'smtp', 'pop3', 'imap'])
        .describe('Type of check to perform'),
      probeId: z.number().optional().describe('Specific probe server ID to use for the check')
    })
  )
  .output(
    z.object({
      result: z
        .object({
          probeId: z.number().optional().describe('Probe server that performed the check'),
          probeDescription: z
            .string()
            .optional()
            .describe('Probe server location description'),
          status: z.string().optional().describe('Result status'),
          responseTime: z.number().optional().describe('Response time in ms'),
          statusDescription: z.string().optional().describe('Short status description'),
          statusDescriptionLong: z.string().optional().describe('Detailed status description')
        })
        .describe('Check result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.performSingleCheck({
      host: ctx.input.hostname,
      type: ctx.input.type,
      probeid: ctx.input.probeId
    });

    let r = result.result || result;

    return {
      output: {
        result: {
          probeId: r.probeid,
          probeDescription: r.probedesc,
          status: r.status,
          responseTime: r.responsetime,
          statusDescription: r.statusdesc,
          statusDescriptionLong: r.statusdesclong
        }
      },
      message: `Single check against \`${ctx.input.hostname}\` returned status **${r.status || 'unknown'}** (${r.responsetime || 0}ms).`
    };
  })
  .build();
