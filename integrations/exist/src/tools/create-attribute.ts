import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAttributeTool = SlateTool.create(spec, {
  name: 'Create Attribute',
  key: 'create_attribute',
  description: `Create new attributes in Exist, either from existing templates or as fully custom attributes. Custom attributes require a label, group, and value type. The service automatically gets ownership of created attributes.`,
  instructions: [
    'To create from a template, provide only the templateName.',
    'For custom attributes, provide label, group, and valueType.',
    'The attribute name is auto-generated from the label and returned in the response.',
    'Value types: 0=quantity (integer), 1=decimal, 2=string, 3=duration, 4=time of day, 5=percentage, 7=boolean, 8=scale (1-5/1-9).',
    'Groups must match one of the existing Exist groups: activity, productivity, mood, sleep, workouts, events, finance, food, health, location, media, social, weather, symptoms, medication, custom.'
  ],
  constraints: [
    'Maximum 35 attributes per call.',
    'Requires OAuth2 authentication with the write scope for the target group.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      attributes: z
        .array(
          z.object({
            templateName: z
              .string()
              .optional()
              .describe('Template name to create from (e.g. "facebook_reactions")'),
            label: z
              .string()
              .optional()
              .describe('Human-readable label for a custom attribute (e.g. "Time Reading")'),
            group: z
              .string()
              .optional()
              .describe('Group for a custom attribute (e.g. "media", "activity", "health")'),
            valueType: z
              .number()
              .optional()
              .describe(
                'Value type for a custom attribute: 0=quantity, 1=decimal, 2=string, 3=duration, 4=time of day, 5=percentage, 7=boolean, 8=scale'
              ),
            manual: z
              .boolean()
              .optional()
              .describe('Whether data will be entered manually by the user')
          })
        )
        .min(1)
        .max(35)
        .describe('Attributes to create')
    })
  )
  .output(
    z.object({
      successCount: z.number().describe('Number of successfully created attributes'),
      failedCount: z.number().describe('Number of failed creations'),
      failures: z
        .array(
          z.object({
            error: z.string().describe('Error message')
          })
        )
        .describe('Details of any failures')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let payload = ctx.input.attributes.map(a => ({
      template: a.templateName,
      label: a.label,
      group: a.group,
      valueType: a.valueType,
      manual: a.manual
    }));

    let result = await client.createAttributes(payload);

    let failures = result.failed.map(f => ({
      error: f.error
    }));

    return {
      output: {
        successCount: result.success.length,
        failedCount: result.failed.length,
        failures
      },
      message: `Created **${result.success.length}** attribute(s)${result.failed.length > 0 ? `, **${result.failed.length}** failed` : ''}.`
    };
  })
  .build();
