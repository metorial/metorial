import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { XForceClient } from '../lib/client';
import { spec } from '../spec';

export let newVulnerabilitiesTrigger = SlateTrigger.create(spec, {
  name: 'New Vulnerabilities',
  key: 'new_vulnerabilities',
  description:
    'Monitors the X-Force vulnerability database for newly reported or updated vulnerabilities. Polls periodically and emits an event for each new vulnerability discovered since the last check.'
})
  .input(
    z.object({
      xfid: z.number().describe('X-Force Database ID'),
      title: z.string().describe('Vulnerability title'),
      description: z.string().optional().describe('Vulnerability description'),
      riskLevel: z.number().optional().describe('Risk level score'),
      reportedDate: z.string().optional().describe('Date the vulnerability was reported'),
      stdCode: z.array(z.string()).optional().describe('Standard codes (CVE, BID, etc.)'),
      tagName: z.string().optional().describe('Tag/category name')
    })
  )
  .output(
    z.object({
      xfid: z.number().describe('X-Force Database ID'),
      title: z.string().describe('Vulnerability title'),
      description: z.string().optional().describe('Vulnerability description'),
      riskLevel: z.number().optional().describe('Risk level score'),
      reportedDate: z.string().optional().describe('Date the vulnerability was reported'),
      stdCode: z.array(z.string()).optional().describe('Standard codes (CVE, BID, etc.)'),
      tagName: z.string().optional().describe('Tag/category name')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new XForceClient({
        token: ctx.auth.token,
        password: ctx.auth.password
      });

      let lastChecked = (ctx.input.state as any)?.lastChecked as string | undefined;
      let startDate =
        lastChecked || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      let now = new Date().toISOString().split('T')[0];

      let data = await client.getRecentVulnerabilities(startDate, now, 200);
      let rows = data.rows || data || [];

      let lastSeenXfid = (ctx.input.state as any)?.lastSeenXfid as number | undefined;

      let inputs = rows
        .filter((v: any) => !lastSeenXfid || v.xfdbid > lastSeenXfid)
        .map((v: any) => ({
          xfid: v.xfdbid,
          title: v.title || '',
          description: v.description,
          riskLevel: v.risk_level,
          reportedDate: v.reported,
          stdCode: v.stdcode,
          tagName: v.tagname
        }));

      let maxXfid = rows.reduce(
        (max: number, v: any) => Math.max(max, v.xfdbid || 0),
        lastSeenXfid || 0
      );

      return {
        inputs,
        updatedState: {
          lastChecked: now,
          lastSeenXfid: maxXfid
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'vulnerability.reported',
        id: String(ctx.input.xfid),
        output: {
          xfid: ctx.input.xfid,
          title: ctx.input.title,
          description: ctx.input.description,
          riskLevel: ctx.input.riskLevel,
          reportedDate: ctx.input.reportedDate,
          stdCode: ctx.input.stdCode,
          tagName: ctx.input.tagName
        }
      };
    }
  })
  .build();
