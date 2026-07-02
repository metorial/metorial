import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newInsightsTrigger = SlateTrigger.create(spec, {
  name: 'New Insights',
  key: 'new_insights',
  description:
    "Triggers when new insights are generated for the user's tracked data. Insights include daily events (e.g., highest steps in X days) and weekly/monthly summaries."
})
  .input(
    z.object({
      insightId: z
        .string()
        .describe('Unique identifier for the insight (created timestamp + type)'),
      createdAt: z.string().describe('When the insight was generated'),
      targetDate: z.string().describe('The date the insight refers to'),
      typeName: z.string().describe('Insight type identifier'),
      period: z.number().describe('Period type'),
      priority: z.number().describe('Priority level'),
      attributeName: z.string().describe('Associated attribute name'),
      attributeLabel: z.string().describe('Associated attribute label'),
      groupName: z.string().describe('Attribute group name'),
      text: z.string().describe('Plain text description of the insight'),
      html: z.string().describe('HTML formatted description')
    })
  )
  .output(
    z.object({
      attributeName: z.string().describe('Associated attribute name'),
      attributeLabel: z.string().describe('Associated attribute label'),
      groupName: z.string().describe('Attribute group name'),
      targetDate: z.string().describe('The date the insight refers to'),
      text: z.string().describe('Plain text description of the insight'),
      html: z.string().describe('HTML formatted description'),
      period: z.number().describe('Period type (1=day, 7=week, etc.)'),
      priority: z
        .number()
        .describe('Priority level (1=today, 2=this week, 3=last week, 4=last month)'),
      typeName: z.string().describe('Insight type identifier'),
      createdAt: z.string().describe('When the insight was generated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

      let lastPolledAt = (ctx.state as Record<string, unknown>)?.lastPolledAt as
        | string
        | undefined;
      let result = await client.getInsights({
        limit: 100,
        dateMin: lastPolledAt
      });

      let now = new Date().toISOString().split('T')[0];

      let inputs = result.results.map(insight => ({
        insightId: `${insight.created}_${insight.type.name}_${insight.target_date}`,
        createdAt: insight.created,
        targetDate: insight.target_date,
        typeName: insight.type.name,
        period: insight.type.period,
        priority: insight.type.priority,
        attributeName: insight.type.attribute.name,
        attributeLabel: insight.type.attribute.label,
        groupName: insight.type.attribute.group.name,
        text: insight.text,
        html: insight.html
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: now
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'insight.created',
        id: ctx.input.insightId,
        output: {
          attributeName: ctx.input.attributeName,
          attributeLabel: ctx.input.attributeLabel,
          groupName: ctx.input.groupName,
          targetDate: ctx.input.targetDate,
          text: ctx.input.text,
          html: ctx.input.html,
          period: ctx.input.period,
          priority: ctx.input.priority,
          typeName: ctx.input.typeName,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
