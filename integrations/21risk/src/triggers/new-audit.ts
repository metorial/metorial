import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newAuditTrigger = SlateTrigger.create(spec, {
  name: 'New Audit',
  key: 'new_audit',
  description: 'Triggers when a new audit or report is created in 21RISK.'
})
  .input(
    z.object({
      auditId: z.string().describe('Unique identifier of the audit'),
      audit: z.record(z.string(), z.any()).describe('Full audit record from the API')
    })
  )
  .output(
    z
      .object({
        auditId: z.string().describe('Unique identifier of the audit'),
        name: z.string().optional().describe('Name or title of the audit'),
        siteId: z.string().optional().describe('ID of the site where the audit was performed'),
        siteName: z.string().optional().describe('Name of the associated site'),
        status: z.string().optional().describe('Current status of the audit'),
        createdDate: z.string().optional().describe('Date the audit was created')
      })
      .passthrough()
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;

      let filterExpr = lastPolledAt ? `CreatedDate gt ${lastPolledAt}` : undefined;

      let audits = await client.getAudits({
        filter: filterExpr,
        orderby: 'CreatedDate desc',
        top: 50
      });

      let results = Array.isArray(audits) ? audits : [];

      let newLastPolledAt = lastPolledAt;
      if (results.length > 0) {
        let latestDate = results[0].CreatedDate ?? results[0].createdDate;
        if (latestDate) {
          newLastPolledAt = latestDate;
        }
      }

      return {
        inputs: results.map((audit: any) => ({
          auditId: String(audit.Id ?? audit.id ?? audit.AuditId ?? audit.auditId ?? ''),
          audit
        })),
        updatedState: {
          lastPolledAt: newLastPolledAt ?? new Date().toISOString()
        }
      };
    },
    handleEvent: async ctx => {
      let audit = ctx.input.audit as Record<string, any>;

      return {
        type: 'audit.created',
        id: ctx.input.auditId,
        output: {
          auditId: ctx.input.auditId,
          name: String(audit.Name ?? audit.name ?? ''),
          siteId: String(audit.SiteId ?? audit.siteId ?? ''),
          siteName: String(audit.SiteName ?? audit.siteName ?? ''),
          status: String(audit.Status ?? audit.status ?? ''),
          createdDate: String(audit.CreatedDate ?? audit.createdDate ?? ''),
          ...audit
        }
      };
    }
  })
  .build();
