import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleFormsClient } from '../lib/client';
import { googleFormsActionScopes } from '../scopes';
import { spec } from '../spec';

let questionSchema = z
  .object({
    questionId: z.string().optional().describe('Unique ID of the question'),
    required: z.boolean().optional().describe('Whether the question requires an answer'),
    questionType: z
      .string()
      .optional()
      .describe(
        'Type of question (e.g., choiceQuestion, textQuestion, scaleQuestion, dateQuestion, timeQuestion)'
      ),
    questionDetails: z.any().optional().describe('Type-specific question configuration'),
    grading: z
      .object({
        pointValue: z.number().optional().describe('Points awarded for correct answer'),
        correctAnswers: z.any().optional().describe('The correct answers for auto-grading')
      })
      .optional()
      .describe('Grading configuration for quiz questions')
  })
  .describe('A question on the form');

let itemSchema = z
  .object({
    itemId: z.string().optional().describe('Unique ID of the item'),
    title: z.string().optional().describe('Title/label of the item'),
    description: z.string().optional().describe('Description text of the item'),
    itemType: z
      .string()
      .optional()
      .describe(
        'Type of item (questionItem, questionGroupItem, pageBreakItem, textItem, imageItem, videoItem)'
      ),
    question: questionSchema
      .optional()
      .describe('Question details if this is a question item'),
    questions: z
      .array(questionSchema)
      .optional()
      .describe('Questions if this is a question group item')
  })
  .describe('An item (question, section, text, image, video) on the form');

export let getForm = SlateTool.create(spec, {
  name: 'Get Form',
  key: 'get_form',
  description: `Retrieves the full content and metadata of a Google Form by its ID. Returns the form's title, description, settings, all items (questions, sections, images, videos), and quiz configuration.

Useful for inspecting a form's structure, verifying changes, or reading question details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleFormsActionScopes.getForm)
  .input(
    z.object({
      formId: z.string().describe('The ID of the Google Form to retrieve')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Unique identifier of the form'),
      title: z.string().optional().describe('Title of the form'),
      documentTitle: z.string().optional().describe('Document title in Google Drive'),
      description: z.string().optional().describe('Description of the form'),
      responderUri: z
        .string()
        .optional()
        .describe('URL where respondents can submit the form'),
      revisionId: z.string().optional().describe('Current revision ID of the form'),
      linkedSheetId: z
        .string()
        .optional()
        .describe('ID of the linked Google Sheet for responses'),
      isQuiz: z.boolean().optional().describe('Whether the form is configured as a quiz'),
      items: z
        .array(itemSchema)
        .optional()
        .describe('All items (questions, sections, text blocks, etc.) in the form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleFormsClient(ctx.auth.token);

    let form = await client.getForm(ctx.input.formId);

    let items = (form.items || []).map(item => {
      let itemType = 'unknown';
      let question: any;
      let questions: any[] | undefined;

      if (item.questionItem) {
        itemType = 'questionItem';
        let q = item.questionItem.question;
        if (q) {
          let questionType = 'unknown';
          let questionDetails: any;
          if (q.choiceQuestion) {
            questionType = 'choiceQuestion';
            questionDetails = q.choiceQuestion;
          } else if (q.textQuestion) {
            questionType = 'textQuestion';
            questionDetails = q.textQuestion;
          } else if (q.scaleQuestion) {
            questionType = 'scaleQuestion';
            questionDetails = q.scaleQuestion;
          } else if (q.dateQuestion) {
            questionType = 'dateQuestion';
            questionDetails = q.dateQuestion;
          } else if (q.timeQuestion) {
            questionType = 'timeQuestion';
            questionDetails = q.timeQuestion;
          } else if (q.fileUploadQuestion) {
            questionType = 'fileUploadQuestion';
            questionDetails = q.fileUploadQuestion;
          } else if (q.ratingQuestion) {
            questionType = 'ratingQuestion';
            questionDetails = q.ratingQuestion;
          } else if (q.rowQuestion) {
            questionType = 'rowQuestion';
            questionDetails = q.rowQuestion;
          }

          question = {
            questionId: q.questionId,
            required: q.required,
            questionType,
            questionDetails,
            grading: q.grading
              ? {
                  pointValue: q.grading.pointValue,
                  correctAnswers: q.grading.correctAnswers
                }
              : undefined
          };
        }
      } else if (item.questionGroupItem) {
        itemType = 'questionGroupItem';
        questions = (item.questionGroupItem.questions || []).map(q => {
          let questionType = 'unknown';
          let questionDetails: any;
          if (q.choiceQuestion) {
            questionType = 'choiceQuestion';
            questionDetails = q.choiceQuestion;
          } else if (q.textQuestion) {
            questionType = 'textQuestion';
            questionDetails = q.textQuestion;
          } else if (q.scaleQuestion) {
            questionType = 'scaleQuestion';
            questionDetails = q.scaleQuestion;
          } else if (q.rowQuestion) {
            questionType = 'rowQuestion';
            questionDetails = q.rowQuestion;
          }

          return {
            questionId: q.questionId,
            required: q.required,
            questionType,
            questionDetails,
            grading: q.grading
              ? {
                  pointValue: q.grading.pointValue,
                  correctAnswers: q.grading.correctAnswers
                }
              : undefined
          };
        });
      } else if (item.pageBreakItem !== undefined) {
        itemType = 'pageBreakItem';
      } else if (item.textItem !== undefined) {
        itemType = 'textItem';
      } else if (item.imageItem) {
        itemType = 'imageItem';
      } else if (item.videoItem) {
        itemType = 'videoItem';
      }

      return {
        itemId: item.itemId,
        title: item.title,
        description: item.description,
        itemType,
        question,
        questions
      };
    });

    let itemCount = items.length;
    let questionCount = items.filter(
      i => i.itemType === 'questionItem' || i.itemType === 'questionGroupItem'
    ).length;

    return {
      output: {
        formId: form.formId || ctx.input.formId,
        title: form.info?.title,
        documentTitle: form.info?.documentTitle,
        description: form.info?.description,
        responderUri: form.responderUri,
        revisionId: form.revisionId,
        linkedSheetId: form.linkedSheetId,
        isQuiz: form.settings?.quizSettings?.isQuiz,
        items
      },
      message: `Retrieved form **"${form.info?.title || 'Untitled'}"** with ${itemCount} item(s) (${questionCount} question(s)). ${form.settings?.quizSettings?.isQuiz ? 'This form is configured as a quiz.' : ''}`
    };
  })
  .build();
