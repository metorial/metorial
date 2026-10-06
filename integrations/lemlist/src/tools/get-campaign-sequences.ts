import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  optionalBoolean,
  optionalNumber,
  optionalText,
  row,
  rows,
  text
} from '../lib/client';
import { spec } from '../spec';

const branch = z.object({
  sequenceId: z.string().optional(),
  key: z.string().optional(),
  label: z.string().optional(),
  name: z.string().optional(),
  fallback: z.boolean().optional(),
  delay: z.number().optional(),
  delayType: z.string().optional(),
  selector: z.string().optional()
});
const step = z.object({
  stepId: z.string().optional(),
  type: z.string().optional(),
  index: z.number().optional(),
  delayDays: z.number().optional(),
  sequenceId: z.string().optional(),
  sequenceStep: z.number().optional(),
  emailTemplateId: z.string().optional(),
  message: z.string().optional(),
  subject: z.string().optional(),
  conditions: z.array(branch).optional()
});
export const getCampaignSequences = SlateTool.create(spec, {
  key: 'get_campaign_sequences',
  name: 'Get Campaign Sequences',
  description:
    'Read the main and conditional sequences of a campaign, including step IDs, ordering, delays in days, message content and branch sub-sequence IDs. This does not launch or modify outreach.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .describe('Campaign identifier from List Campaigns or Get Campaign.')
    })
  )
  .output(
    z.object({
      sequences: z.array(
        z.object({
          sequenceId: z.string(),
          level: z.number().optional(),
          parentId: z.string().optional(),
          conditionalStepIndex: z.number().optional(),
          steps: z.array(step).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const data = await new Client({ token: ctx.auth.token }).getCampaignSequences(
      ctx.input.campaignId
    );
    const sequences = Object.entries(data).map(([id, value]) => {
      const sequence = row(value);
      if (sequence._id !== undefined && text(sequence._id) !== id)
        throw createApiServiceError('Lemlist returned inconsistent sequence identifiers.');
      return {
        sequenceId: text(id),
        level: optionalNumber(sequence.level),
        parentId: optionalText(sequence.parentId),
        conditionalStepIndex: optionalNumber(sequence.conditionalStepIndex),
        steps:
          sequence.steps == null
            ? undefined
            : rows(sequence.steps).map(item => ({
                stepId: optionalText(item._id),
                type: optionalText(item.type),
                index: optionalNumber(item.index),
                delayDays: optionalNumber(item.delay),
                sequenceId: optionalText(item.sequenceId),
                sequenceStep: optionalNumber(item.sequenceStep),
                emailTemplateId: optionalText(item.emailTemplateId),
                message: optionalText(item.message),
                subject: optionalText(item.subject),
                conditions:
                  item.conditions == null
                    ? undefined
                    : rows(item.conditions).map(condition => ({
                        sequenceId: optionalText(condition.sequenceId),
                        key: optionalText(condition.key),
                        label: optionalText(condition.label),
                        name: optionalText(condition.name),
                        fallback: optionalBoolean(condition.fallback),
                        delay: optionalNumber(condition.delay),
                        delayType: optionalText(condition.delayType),
                        selector: optionalText(condition.selector)
                      }))
              }))
      };
    });
    return {
      output: { sequences },
      message: `Retrieved **${sequences.length}** campaign sequence(s).`
    };
  })
  .build();
