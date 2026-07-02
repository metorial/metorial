import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSurvey = SlateTool.create(spec, {
  name: 'Update Survey',
  key: 'update_survey',
  description: `Update an existing survey's properties. Modify the name, status, questions, display settings, endings, or other configuration. Only provide the fields you want to change.`,
  instructions: [
    'Only include the fields you want to update. Omitted fields remain unchanged.',
    'To change survey status, update the "status" field (e.g., from "draft" to "inProgress" to publish it).'
  ]
})
  .input(
    z.object({
      surveyId: z.string().describe('ID of the survey to update'),
      name: z.string().optional().describe('Updated survey name'),
      status: z
        .enum(['draft', 'inProgress', 'paused', 'completed'])
        .optional()
        .describe('Updated survey status'),
      questions: z.array(z.any()).optional().describe('Updated array of survey questions'),
      displayOption: z
        .enum(['displayOnce', 'displayMultiple', 'respondMultiple', 'displaySome'])
        .optional()
        .describe('Updated display option'),
      autoClose: z.number().optional().describe('Auto-close after this many seconds'),
      autoComplete: z.number().optional().describe('Auto-complete after this many responses'),
      delay: z.number().optional().describe('Display delay in seconds'),
      endings: z.array(z.any()).optional().describe('Updated end screen configurations'),
      welcomeCard: z.any().optional().describe('Updated welcome card configuration'),
      hiddenFields: z.any().optional().describe('Updated hidden fields configuration'),
      redirectUrl: z.string().optional().describe('Redirect URL after survey completion')
    })
  )
  .output(
    z.object({
      surveyId: z.string().describe('ID of the updated survey'),
      name: z.string().describe('Name of the updated survey'),
      status: z.string().describe('Status of the updated survey'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { surveyId, ...updateData } = ctx.input;

    // Filter out undefined values
    let filtered: Record<string, any> = {};
    for (let [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        filtered[key] = value;
      }
    }

    let survey = await client.updateSurvey(surveyId, filtered);

    return {
      output: {
        surveyId: survey.id,
        name: survey.name ?? '',
        status: survey.status ?? '',
        updatedAt: survey.updatedAt ?? ''
      },
      message: `Updated survey **${survey.name}** (status: ${survey.status}).`
    };
  })
  .build();
