import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { XForceClient } from '../lib/client';
import { spec } from '../spec';

export let newThreatReportsTrigger = SlateTrigger.create(spec, {
  name: 'New Threat Reports',
  key: 'new_threat_reports',
  description:
    'Monitors IBM X-Force Exchange for newly published threat intelligence reports including threat analysis, OSINT advisories, malware analysis, industry profiles, and threat group profiles.'
})
  .input(
    z.object({
      reportId: z.string().describe('Report ID'),
      title: z.string().describe('Report title'),
      reportType: z.string().optional().describe('Report type'),
      created: z.string().optional().describe('Report creation date'),
      summary: z.string().optional().describe('Report summary'),
      tags: z.array(z.string()).optional().describe('Report tags')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('Report ID'),
      title: z.string().describe('Report title'),
      reportType: z
        .string()
        .optional()
        .describe('Report type (threat_analysis, malware, osint, industry, threat_group)'),
      created: z.string().optional().describe('Report creation date'),
      summary: z.string().optional().describe('Report summary or abstract'),
      tags: z.array(z.string()).optional().describe('Report tags')
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
        lastChecked ||
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let data = await client.getThreatReports({
        startDate,
        limit: 50
      });

      let reports = data.rows || data || [];
      let seenIds = ((ctx.input.state as any)?.seenIds || []) as string[];
      let seenSet = new Set(seenIds);

      let newReports = reports.filter((r: any) => {
        let id = r.id || r.reportId;
        return id && !seenSet.has(id);
      });

      let inputs = newReports.map((r: any) => ({
        reportId: r.id || r.reportId || '',
        title: r.title || '',
        reportType: r.type,
        created: r.created,
        summary: r.summary || r.abstract,
        tags: r.tags
      }));

      let allIds = reports.map((r: any) => r.id || r.reportId).filter(Boolean);
      let now = new Date().toISOString().split('T')[0];

      return {
        inputs,
        updatedState: {
          lastChecked: now,
          seenIds: allIds.slice(0, 200)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `threat_report.published`,
        id: ctx.input.reportId,
        output: {
          reportId: ctx.input.reportId,
          title: ctx.input.title,
          reportType: ctx.input.reportType,
          created: ctx.input.created,
          summary: ctx.input.summary,
          tags: ctx.input.tags
        }
      };
    }
  })
  .build();
