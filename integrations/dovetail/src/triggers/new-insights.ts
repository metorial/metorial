import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newInsights = SlateTrigger.create(spec, {
  name: 'New Insights',
  key: 'new_insights',
  description: 'Triggers when new insights are created in the Dovetail workspace.'
})
  .input(
    z.object({
      insightId: z.string(),
      title: z.string(),
      previewText: z.string().nullable().optional(),
      projectId: z.string().nullable().optional(),
      projectTitle: z.string().nullable().optional(),
      authorId: z.string().nullable().optional(),
      published: z.boolean().optional(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .output(
    z.object({
      insightId: z.string().describe('ID of the new insight'),
      title: z.string().describe('Title of the insight'),
      previewText: z.string().nullable().optional().describe('Preview text of the insight'),
      projectId: z.string().nullable().optional().describe('Associated project ID'),
      projectTitle: z.string().nullable().optional().describe('Associated project title'),
      authorId: z.string().nullable().optional().describe('Author user ID'),
      published: z.boolean().optional().describe('Whether the insight is published'),
      createdAt: z.string().describe('Insight creation timestamp'),
      updatedAt: z.string().describe('Insight last updated timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let state = ctx.state as { lastSeenAt?: string } | null;

      let result = await client.listInsights({
        sort: 'created_at:desc',
        limit: 50
      });

      let insights = result.data;

      let firstInsight = insights[0];
      let newLastSeenAt = firstInsight ? firstInsight.created_at : state?.lastSeenAt;

      // On first run (no state), don't emit events, just record the cursor
      if (!state?.lastSeenAt) {
        return {
          inputs: [],
          updatedState: { lastSeenAt: newLastSeenAt }
        };
      }

      // Filter to only new insights
      let newInsights = insights.filter(i => i.created_at > state!.lastSeenAt!);

      let inputs = newInsights.map(i => ({
        insightId: i.id,
        title: i.title,
        previewText: i.preview_text ?? null,
        projectId: i.project_id ?? null,
        projectTitle: i.project_title ?? null,
        authorId: i.author_id ?? null,
        published: i.published,
        createdAt: i.created_at,
        updatedAt: i.updated_at
      }));

      return {
        inputs,
        updatedState: { lastSeenAt: newLastSeenAt }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'insight.created',
        id: ctx.input.insightId,
        output: {
          insightId: ctx.input.insightId,
          title: ctx.input.title,
          previewText: ctx.input.previewText,
          projectId: ctx.input.projectId,
          projectTitle: ctx.input.projectTitle,
          authorId: ctx.input.authorId,
          published: ctx.input.published,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
