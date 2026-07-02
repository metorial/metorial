import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassMarkerClient } from '../lib/client';
import { spec } from '../spec';

// ── List / Get Questions ──

let questionOutputSchema = z.object({
  questionId: z.number().describe('Unique identifier of the question'),
  questionType: z
    .string()
    .describe('Type of question (e.g., multiplechoice, truefalse, essay)'),
  question: z.string().describe('The question text'),
  categoryId: z.number().optional().describe('Category the question belongs to'),
  points: z.number().optional().describe('Point value of the question'),
  randomAnswers: z.boolean().optional().describe('Whether answer options are randomized'),
  correctFeedback: z.string().optional().describe('Feedback shown when answered correctly'),
  incorrectFeedback: z
    .string()
    .optional()
    .describe('Feedback shown when answered incorrectly'),
  options: z.any().optional().describe('Answer options for the question'),
  correctOptions: z.array(z.string()).optional().describe('The correct answer option keys'),
  lastUpdatedTimestamp: z.number().optional().describe('Unix timestamp of last update'),
  status: z.string().optional().describe('Question status')
});

export let getQuestions = SlateTool.create(spec, {
  name: 'Get Questions',
  key: 'get_questions',
  description: `Retrieve questions from your ClassMarker account. Fetch all questions (paginated) or a single question by ID. Returns question text, type, options, correct answers, point values, and category assignments.`,
  instructions: [
    'To list all questions, omit the `questionId` field. Use `page` for pagination (200 questions per page).',
    'To get a specific question, provide the `questionId`.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      questionId: z
        .number()
        .optional()
        .describe('ID of a specific question to retrieve. Omit to list all questions.'),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination when listing all questions (200 per page)')
    })
  )
  .output(
    z.object({
      questions: z.array(questionOutputSchema).describe('List of questions'),
      totalQuestions: z.number().optional().describe('Total number of questions available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassMarkerClient({
      token: ctx.auth.token,
      apiSecret: ctx.auth.apiSecret
    });

    let { questionId, page } = ctx.input;

    if (questionId !== undefined) {
      let data = await client.getQuestion(questionId);
      let q = data?.data?.question || data?.question || data;
      let mapped = mapQuestion(q);

      return {
        output: { questions: [mapped], totalQuestions: 1 },
        message: `Retrieved question **#${questionId}**: "${mapped.question}"`
      };
    }

    let data = await client.getQuestions(page);
    let rawQuestions = data?.data?.questions || data?.questions || [];
    let questions = (
      Array.isArray(rawQuestions) ? rawQuestions : Object.values(rawQuestions)
    ).map(mapQuestion);

    return {
      output: {
        questions,
        totalQuestions: data?.data?.total_questions || data?.total_questions
      },
      message: `Retrieved **${questions.length}** question(s)${page ? ` (page ${page})` : ''}.`
    };
  })
  .build();

let mapQuestion = (q: any) => ({
  questionId: q.question_id,
  questionType: q.question_type,
  question: q.question,
  categoryId: q.category_id,
  points: q.points,
  randomAnswers: q.random_answers,
  correctFeedback: q.correct_feedback,
  incorrectFeedback: q.incorrect_feedback,
  options: q.options,
  correctOptions: q.correct_options,
  lastUpdatedTimestamp: q.last_updated_timestamp,
  status: q.status
});

// ── Create / Update Question ──

let questionOptionSchema = z.object({
  content: z.string().describe('The text content of this answer option')
});

export let createOrUpdateQuestion = SlateTool.create(spec, {
  name: 'Create or Update Question',
  key: 'create_or_update_question',
  description: `Create a new question or update an existing one in ClassMarker. Supports multiple choice, multiple response, true/false, and essay question types. Provide answer options and correct answers as needed for the question type.`,
  instructions: [
    'To create a new question, omit `questionId`. To update, provide the `questionId` of the question to modify.',
    'For **multiplechoice** and **multipleresponse** questions, provide `options` (keyed A-D+) and `correctOptions` (array of correct keys).',
    'For **truefalse** questions, provide two options (A: True, B: False) and set `correctOptions` to the correct key.',
    'For **essay** questions, no options or correct answers are needed (requires manual grading).',
    'Free text, grammar, and matching question types are read-only and cannot be created or updated via the API.'
  ],
  constraints: [
    'Supported question types for create/update: multiplechoice, multipleresponse, truefalse, essay.',
    'Rate limit: 30 requests per hour per API key.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      questionId: z
        .number()
        .optional()
        .describe('ID of an existing question to update. Omit to create a new question.'),
      questionType: z
        .enum(['multiplechoice', 'multipleresponse', 'truefalse', 'essay'])
        .describe('Type of question'),
      question: z.string().describe('The question text'),
      categoryId: z.number().optional().describe('Category ID to assign the question to'),
      points: z.number().optional().describe('Point value for the question'),
      randomAnswers: z.boolean().optional().describe('Whether to randomize answer order'),
      correctFeedback: z
        .string()
        .optional()
        .describe('Feedback shown when answered correctly'),
      incorrectFeedback: z
        .string()
        .optional()
        .describe('Feedback shown when answered incorrectly'),
      options: z
        .record(z.string(), questionOptionSchema)
        .optional()
        .describe(
          'Answer options keyed by letter (e.g., { "A": { "content": "Option 1" }, "B": { "content": "Option 2" } })'
        ),
      correctOptions: z
        .array(z.string())
        .optional()
        .describe('Array of correct option keys (e.g., ["A", "C"])'),
      gradeStyle: z
        .enum(['partial_with_deduction', 'partial_without_deduction', 'off'])
        .optional()
        .describe('Grading style for multiple response questions')
    })
  )
  .output(
    z.object({
      questionId: z.number().optional().describe('ID of the created or updated question'),
      status: z.string().describe('Status of the operation'),
      response: z.any().describe('Full response from ClassMarker')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassMarkerClient({
      token: ctx.auth.token,
      apiSecret: ctx.auth.apiSecret
    });

    let {
      questionId,
      questionType,
      question,
      categoryId,
      points,
      randomAnswers,
      correctFeedback,
      incorrectFeedback,
      options,
      correctOptions,
      gradeStyle
    } = ctx.input;

    let body: Record<string, any> = {
      question_type: questionType,
      question
    };

    if (categoryId !== undefined) body.category_id = categoryId;
    if (points !== undefined) body.points = points;
    if (randomAnswers !== undefined) body.random_answers = randomAnswers;
    if (correctFeedback !== undefined) body.correct_feedback = correctFeedback;
    if (incorrectFeedback !== undefined) body.incorrect_feedback = incorrectFeedback;
    if (options !== undefined) body.options = options;
    if (correctOptions !== undefined) body.correct_options = correctOptions;
    if (gradeStyle !== undefined) body.grade_style = gradeStyle;

    let data: any;
    let isUpdate = questionId !== undefined;

    if (isUpdate) {
      data = await client.updateQuestion(questionId!, body);
    } else {
      data = await client.createQuestion(body);
    }

    let resultQuestionId =
      data?.data?.question?.question_id || data?.question_id || questionId;

    return {
      output: {
        questionId: resultQuestionId,
        status: data?.status || 'ok',
        response: data
      },
      message: `Successfully ${isUpdate ? 'updated' : 'created'} ${questionType} question${resultQuestionId ? ` **#${resultQuestionId}**` : ''}.`
    };
  })
  .build();
