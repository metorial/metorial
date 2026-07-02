import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let funnelStepSchema = z
  .object({
    collectionName: z.string().describe('The event collection for this step'),
    actorProperty: z
      .string()
      .describe('The property that identifies the actor (e.g. "user.id")'),
    timeframe: z
      .union([
        z.string(),
        z.object({
          start: z.string(),
          end: z.string()
        })
      ])
      .optional()
      .describe('Timeframe for this step'),
    filters: z
      .array(
        z.object({
          propertyName: z.string(),
          operator: z.string(),
          propertyValue: z.any()
        })
      )
      .optional()
      .describe('Filters for this step'),
    inverted: z
      .boolean()
      .optional()
      .describe('If true, matches actors who did NOT perform this step'),
    optional: z
      .boolean()
      .optional()
      .describe('If true, this step is optional in the funnel sequence'),
    withActors: z
      .boolean()
      .optional()
      .describe('If true, return the list of actor IDs for this step')
  })
  .describe('A step in the funnel analysis');

export let funnelAnalysis = SlateTool.create(spec, {
  name: 'Funnel Analysis',
  key: 'funnel_analysis',
  description: `Run a funnel analysis to track conversion across a sequence of steps. Supports **inverse steps** (actors who did NOT do something), **optional steps**, and returning **actor IDs** at each step. Useful for tracking user flows like signup-to-purchase or onboarding funnels.`,
  instructions: [
    'Each step must specify an actorProperty that identifies the unique user/entity being tracked across steps.',
    'Set "inverted" to true on a step to find actors who did NOT perform that step.',
    'Set "withActors" to true to retrieve the list of actor IDs at that step.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      steps: z
        .array(funnelStepSchema)
        .min(2)
        .describe('Array of funnel steps (minimum 2). Steps are evaluated in order.')
    })
  )
  .output(
    z.object({
      result: z.array(z.number()).describe('Array of counts at each funnel step'),
      stepsInfo: z
        .array(z.any())
        .optional()
        .describe('Detailed information for each step, including actor IDs if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      projectId: ctx.config.projectId,
      token: ctx.auth.token
    });

    let steps = ctx.input.steps.map(step => {
      let s: Record<string, any> = {
        event_collection: step.collectionName,
        actor_property: step.actorProperty
      };
      if (step.timeframe) s.timeframe = step.timeframe;
      if (step.inverted) s.inverted = step.inverted;
      if (step.optional) s.optional = step.optional;
      if (step.withActors) s.with_actors = step.withActors;
      if (step.filters) {
        s.filters = step.filters.map(f => ({
          property_name: f.propertyName,
          operator: f.operator,
          property_value: f.propertyValue
        }));
      }
      return s;
    });

    let response = await client.runFunnelAnalysis({ steps });

    let resultArray = Array.isArray(response.result) ? response.result : [];
    let stepLabels = ctx.input.steps.map(
      (s, i) => `Step ${i + 1} (${s.collectionName}): **${resultArray[i] ?? 'N/A'}**`
    );

    return {
      output: {
        result: resultArray,
        stepsInfo: response.steps
      },
      message: `Funnel analysis across **${ctx.input.steps.length}** steps:\n${stepLabels.join('\n')}`
    };
  });
