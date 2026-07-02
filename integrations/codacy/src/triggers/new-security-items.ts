import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let newSecurityItems = SlateTrigger.create(spec, {
  name: 'New Security Items',
  key: 'new_security_items',
  description:
    'Triggers when new security findings (SRM items) are detected in the organization. Monitors SAST, SCA, secrets, IaC, DAST, and other security scan results.'
})
  .input(
    z.object({
      srmItemId: z.string().describe('SRM item identifier.'),
      title: z.string().optional().describe('Security item title.'),
      priority: z.string().optional().describe('Priority level.'),
      status: z.string().optional().describe('Item status.'),
      scanType: z.string().optional().describe('Scan type.'),
      repository: z.string().optional().describe('Repository name.'),
      securityCategory: z.string().optional().describe('Security category.'),
      openedAt: z.string().optional().describe('Date opened.'),
      cve: z.string().optional().describe('CVE identifier.'),
      htmlUrl: z.string().optional().describe('URL to view in Codacy.')
    })
  )
  .output(
    z.object({
      srmItemId: z.string().describe('SRM item identifier.'),
      title: z.string().optional().describe('Security item title.'),
      priority: z.string().optional().describe('Priority level.'),
      status: z.string().optional().describe('Item status.'),
      scanType: z.string().optional().describe('Scan type.'),
      repository: z.string().optional().describe('Repository name.'),
      securityCategory: z.string().optional().describe('Security category.'),
      openedAt: z.string().optional().describe('Date opened.'),
      cve: z.string().optional().describe('CVE identifier.'),
      htmlUrl: z.string().optional().describe('URL to view in Codacy.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let response = await client.searchSecurityItems({}, { limit: 50 });
      let items = response.data ?? [];

      let knownIds: string[] = (ctx.state as any)?.knownItemIds ?? [];
      let knownSet = new Set(knownIds);

      let newItems = items.filter((item: any) => {
        let itemId = item.id;
        return itemId && !knownSet.has(String(itemId));
      });

      let allIds = items.map((item: any) => String(item.id)).filter(Boolean);

      return {
        inputs: newItems.map((item: any) => ({
          srmItemId: String(item.id ?? ''),
          title: item.title ?? undefined,
          priority: item.priority ?? undefined,
          status: item.status ?? undefined,
          scanType: item.scanType ?? undefined,
          repository: item.repository ?? undefined,
          securityCategory: item.securityCategory ?? undefined,
          openedAt: item.openedAt ?? undefined,
          cve: item.cve ?? undefined,
          htmlUrl: item.htmlUrl ?? undefined
        })),
        updatedState: {
          knownItemIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'security_item.created',
        id: `srm-${ctx.input.srmItemId}`,
        output: {
          srmItemId: ctx.input.srmItemId,
          title: ctx.input.title,
          priority: ctx.input.priority,
          status: ctx.input.status,
          scanType: ctx.input.scanType,
          repository: ctx.input.repository,
          securityCategory: ctx.input.securityCategory,
          openedAt: ctx.input.openedAt,
          cve: ctx.input.cve,
          htmlUrl: ctx.input.htmlUrl
        }
      };
    }
  })
  .build();
