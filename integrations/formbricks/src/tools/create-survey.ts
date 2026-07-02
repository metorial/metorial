import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let questionSchema = z
  .object({
    type: z
      .string()
      .describe(
        'Question type: openText, multipleChoiceSingle, multipleChoiceMulti, rating, nps, date, matrix, consent, fileUpload, ranking, address, cta, contactInfo, pictureSelection'
      ),
    headline: z
      .record(z.string(), z.string())
      .describe(
        'Question headline text, keyed by language code, e.g. { "default": "How are you?" }'
      ),
    id: z.string().optional().describe('Question ID (auto-generated if omitted)'),
    required: z.boolean().optional().describe('Whether the question is required'),
    subheader: z
      .record(z.string(), z.string())
      .optional()
      .describe('Subheader text, keyed by language code'),
    inputType: z
      .string()
      .optional()
      .describe('Input type for openText questions (text, email, url, number, phone)'),
    placeholder: z
      .record(z.string(), z.string())
      .optional()
      .describe('Placeholder text, keyed by language code'),
    choices: z
      .array(
        z.object({
          id: z.string().optional(),
          label: z
            .record(z.string(), z.string())
            .describe('Choice label, keyed by language code')
        })
      )
      .optional()
      .describe('Choices for multiple choice questions'),
    range: z.number().optional().describe('Range for rating questions (3, 5, 7, 10)'),
    scale: z.string().optional().describe('Scale type for rating (number, star, smiley)'),
    lowerLabel: z
      .record(z.string(), z.string())
      .optional()
      .describe('Lower label for NPS/rating'),
    upperLabel: z
      .record(z.string(), z.string())
      .optional()
      .describe('Upper label for NPS/rating')
  })
  .passthrough();

export let createSurvey = SlateTool.create(spec, {
  name: 'Create Survey',
  key: 'create_survey',
  description: `Create a new survey in Formbricks. Specify the survey name, type, questions, and display settings. Supports all question types including open text, multiple choice, rating, NPS, date, matrix, consent, and more.`,
  instructions: [
    'The environmentId is required and can be found using the Get Account Info tool.',
    'Questions must have at least a type and headline. The headline should be an object keyed by language code, e.g. { "default": "Your question text" }.'
  ]
})
  .input(
    z.object({
      environmentId: z.string().describe('ID of the environment to create the survey in'),
      name: z.string().describe('Name of the survey'),
      type: z
        .enum(['link', 'app'])
        .describe('Survey type: "link" for shareable link surveys, "app" for in-app surveys'),
      status: z
        .enum(['draft', 'inProgress', 'paused', 'completed'])
        .default('draft')
        .describe('Initial survey status'),
      questions: z.array(questionSchema).describe('Array of survey questions'),
      displayOption: z
        .enum(['displayOnce', 'displayMultiple', 'respondMultiple', 'displaySome'])
        .optional()
        .describe('How often the survey should be displayed'),
      autoClose: z
        .number()
        .optional()
        .describe('Auto-close the survey after this many seconds'),
      autoComplete: z
        .number()
        .optional()
        .describe('Number of responses after which to auto-complete'),
      delay: z.number().optional().describe('Delay in seconds before showing the survey'),
      endings: z
        .array(
          z
            .object({
              type: z.string().default('endScreen'),
              headline: z.record(z.string(), z.string()).optional(),
              subheader: z.record(z.string(), z.string()).optional(),
              buttonLabel: z.record(z.string(), z.string()).optional(),
              buttonLink: z.string().optional()
            })
            .passthrough()
        )
        .optional()
        .describe('End screen configurations'),
      welcomeCard: z
        .object({
          enabled: z.boolean(),
          headline: z.record(z.string(), z.string()).optional(),
          html: z.record(z.string(), z.string()).optional(),
          buttonLabel: z.record(z.string(), z.string()).optional()
        })
        .passthrough()
        .optional()
        .describe('Welcome card configuration'),
      hiddenFields: z
        .object({
          enabled: z.boolean().optional(),
          fieldIds: z.array(z.string()).optional()
        })
        .optional()
        .describe('Hidden fields configuration')
    })
  )
  .output(
    z.object({
      surveyId: z.string().describe('ID of the created survey'),
      name: z.string().describe('Name of the created survey'),
      status: z.string().describe('Status of the created survey'),
      type: z.string().describe('Type of the created survey'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { environmentId, name, type, status, questions, ...rest } = ctx.input;

    let survey = await client.createSurvey({
      environmentId,
      name,
      type,
      status,
      questions,
      ...rest
    });

    return {
      output: {
        surveyId: survey.id,
        name: survey.name ?? '',
        status: survey.status ?? '',
        type: survey.type ?? '',
        createdAt: survey.createdAt ?? ''
      },
      message: `Created survey **${survey.name}** with ID \`${survey.id}\` (status: ${survey.status}).`
    };
  })
  .build();
