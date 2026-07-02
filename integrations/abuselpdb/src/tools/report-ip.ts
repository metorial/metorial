import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reportIp = SlateTool.create(spec, {
  name: 'Report Abusive IP',
  key: 'report_ip',
  description: `Submit an abuse report for a malicious IP address. Specify the IP, one or more abuse category IDs, and an optional comment describing the attack.

**Abuse category IDs:**
- 1: DNS Compromise — 2: DNS Poisoning — 3: Fraud Orders — 4: DDoS Attack
- 5: FTP Brute-Force — 6: Ping of Death — 7: Phishing — 8: Fraud VoIP
- 9: Open Proxy — 10: Web Spam — 11: Email Spam — 12: Blog Spam
- 13: VPN IP — 14: Port Scan — 15: Hacking — 16: SQL Injection
- 17: Spoofing — 18: Brute Force — 19: Bad Web Bot — 20: Exploited Host
- 21: Web App Attack — 22: SSH — 23: IoT Targeted`,
  instructions: [
    'At least one abuse category ID is required.',
    'Strip any personally identifiable information (PII) from comments before submitting.',
    'For SSH brute-force, typically combine categories 18 (Brute Force) and 22 (SSH).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('IPv4 or IPv6 address to report'),
      categories: z
        .array(z.number().min(1).max(23))
        .min(1)
        .describe('Array of abuse category IDs (at least one required)'),
      comment: z
        .string()
        .optional()
        .describe('Description of the observed abuse (must not contain PII)'),
      timestamp: z
        .string()
        .optional()
        .describe(
          'ISO 8601 timestamp of when the abuse was observed (defaults to current time)'
        )
    })
  )
  .output(
    z.object({
      ipAddress: z.string().describe('The reported IP address'),
      abuseConfidenceScore: z
        .number()
        .describe('Updated abuse confidence score after the report')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.reportIp({
      ip: ctx.input.ipAddress,
      categories: ctx.input.categories.join(','),
      comment: ctx.input.comment,
      timestamp: ctx.input.timestamp
    });

    let data = result.data;

    return {
      output: {
        ipAddress: data.ipAddress,
        abuseConfidenceScore: data.abuseConfidenceScore
      },
      message: `Successfully reported **${data.ipAddress}**. Updated abuse confidence score: **${data.abuseConfidenceScore}%**.`
    };
  })
  .build();
