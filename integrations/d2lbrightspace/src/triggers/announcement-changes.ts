import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let announcementChanges = SlateTrigger.create(spec, {
  name: 'Announcement Changes',
  key: 'announcement_changes',
  description:
    'Triggers when announcements (news items) are created or updated in a specific course or org unit. Polls the news feed and detects new or modified items.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of change'),
      newsItemId: z.string().describe('News item ID'),
      orgUnitId: z.string().describe('Org unit ID'),
      title: z.string().optional().describe('Announcement title'),
      body: z.string().optional().describe('Announcement body'),
      createdDate: z.string().optional().describe('Created date'),
      isPublished: z.boolean().optional().describe('Whether published')
    })
  )
  .output(
    z.object({
      newsItemId: z.string().describe('News item ID'),
      orgUnitId: z.string().describe('Org unit ID'),
      title: z.string().optional().describe('Announcement title'),
      body: z.string().optional().describe('Announcement body'),
      createdDate: z.string().optional().describe('Created date'),
      isPublished: z.boolean().optional().describe('Whether published')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let state = ctx.state as {
        knownItems?: Record<string, string>;
        orgUnitIds?: string[];
      } | null;

      // Use current user's enrollments to find org units to monitor
      let client = createClient(ctx.config, ctx.auth);

      let enrollmentsResult = await client.getMyEnrollments({ canAccess: 'true' });
      let enrollmentItems =
        enrollmentsResult?.Items ||
        (Array.isArray(enrollmentsResult) ? enrollmentsResult : []);

      // Limit to first 10 org units to avoid excessive polling
      let orgUnitIds = enrollmentItems
        .slice(0, 10)
        .map((e: any) => String(e.OrgUnit?.Id))
        .filter(Boolean);

      let inputs: any[] = [];
      let knownItems = state?.knownItems || {};
      let newKnownItems: Record<string, string> = {};

      for (let orgUnitId of orgUnitIds) {
        try {
          let newsResult = await client.listNews(orgUnitId);
          let newsItems = Array.isArray(newsResult) ? newsResult : [];

          for (let item of newsItems) {
            let itemId = String(item.Id);
            let lastModified = item.LastModifiedDate || item.CreatedDate || '';
            let key = `${orgUnitId}-${itemId}`;

            newKnownItems[key] = lastModified;

            if (!knownItems[key]) {
              // New item
              if (state?.knownItems) {
                inputs.push({
                  eventType: 'created' as const,
                  newsItemId: itemId,
                  orgUnitId,
                  title: item.Title,
                  body: item.Body?.Text || item.Body?.Content || item.Body?.Html,
                  createdDate: item.CreatedDate,
                  isPublished: item.IsPublished
                });
              }
            } else if (knownItems[key] !== lastModified) {
              // Updated item
              inputs.push({
                eventType: 'updated' as const,
                newsItemId: itemId,
                orgUnitId,
                title: item.Title,
                body: item.Body?.Text || item.Body?.Content || item.Body?.Html,
                createdDate: item.CreatedDate,
                isPublished: item.IsPublished
              });
            }
          }
        } catch {
          // Skip org units we can't access
        }
      }

      return {
        inputs,
        updatedState: {
          knownItems: newKnownItems,
          orgUnitIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `announcement.${ctx.input.eventType}`,
        id: `announcement-${ctx.input.orgUnitId}-${ctx.input.newsItemId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          newsItemId: ctx.input.newsItemId,
          orgUnitId: ctx.input.orgUnitId,
          title: ctx.input.title,
          body: ctx.input.body,
          createdDate: ctx.input.createdDate,
          isPublished: ctx.input.isPublished
        }
      };
    }
  })
  .build();
