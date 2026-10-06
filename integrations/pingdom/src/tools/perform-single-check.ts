import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let performSingleCheck = SlateTool.create(spec, {
  name: 'Perform Single Check',
  key: 'perform_single_check',
  description: `Performs a one-time ad-hoc probe check against a host without creating a persistent check. Sends network requests to the target; only probe systems you are authorized to test.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      hostname: z.string().describe('Target hostname or IP to check'),
      type: z
        .enum(['http', 'httpcustom', 'tcp', 'udp', 'ping', 'dns', 'smtp', 'pop3', 'imap'])
        .describe('Type of check to perform'),
      probeId: z.number().optional().describe('Specific probe server ID to use for the check'),
      url: z.string().optional().describe('HTTP path or required httpcustom XML path'),
      port: z.number().optional().describe('Required target port for TCP/UDP'),
      encryption: z.boolean().optional().describe('Use TLS for HTTP/SMTP'),
      expectedIp: z.string().optional().describe('Required expected resolved IP for DNS'),
      nameServer: z.string().optional().describe('Required DNS server for DNS'),
      stringToSend: z.string().optional().describe('Data sent to TCP/UDP target'),
      stringToExpect: z
        .string()
        .optional()
        .describe('Expected TCP/UDP/SMTP/POP3/IMAP response'),
      shouldContain: z.string().optional().describe('Required HTTP response text'),
      shouldNotContain: z.string().optional().describe('Forbidden HTTP response text')
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
      probeid: ctx.input.probeId,
      url: ctx.input.url,
      port: ctx.input.port,
      encryption: ctx.input.encryption,
      expectedip: ctx.input.expectedIp,
      nameserver: ctx.input.nameServer,
      stringtosend: ctx.input.stringToSend,
      stringtoexpect: ctx.input.stringToExpect,
      shouldcontain: ctx.input.shouldContain,
      shouldnotcontain: ctx.input.shouldNotContain
    });

    let r = result.result;

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
