import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User Details',
  key: 'get_user',
  description: `Retrieve complete details for a specific user, including all their field data and form session progress (current step and completion status for each form).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The unique user identifier to look up')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The user identifier'),
      fieldValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('All field values stored for this user'),
      sessions: z
        .array(
          z.object({
            formId: z.string().optional().describe('Form ID'),
            formName: z.string().optional().describe('Form name'),
            currentStep: z.string().optional().describe('Current step the user is on'),
            completed: z.boolean().optional().describe('Whether the user completed this form')
          })
        )
        .optional()
        .describe('Form session progress for the user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let [fields, sessions] = await Promise.all([
      client.getUserFields(ctx.input.userId).catch(() => null),
      client.getUserSession(ctx.input.userId).catch(() => null)
    ]);

    let fieldValues: Record<string, any> = {};
    if (Array.isArray(fields)) {
      for (let field of fields) {
        fieldValues[field.field_id || field.id] = field.value;
      }
    } else if (fields && typeof fields === 'object') {
      fieldValues = fields;
    }

    let sessionList = Array.isArray(sessions) ? sessions : sessions?.results || [];
    let mappedSessions = sessionList.map((s: any) => ({
      formId: s.form_id || s.id,
      formName: s.form_name || s.name,
      currentStep: s.current_step || s.step,
      completed: s.completed
    }));

    return {
      output: {
        userId: ctx.input.userId,
        fieldValues,
        sessions: mappedSessions
      },
      message: `Retrieved details for user **${ctx.input.userId}** with **${Object.keys(fieldValues).length}** field(s) and **${mappedSessions.length}** form session(s).`
    };
  })
  .build();
