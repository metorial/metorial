import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let updatedAnswerSchema = z.object({
  answerId: z.string().describe('Updated answer record ID.'),
  chatbotId: z.string().describe('Associated chatbot ID.'),
  question: z.string().describe('The custom question.'),
  suggestedAnswer: z.string().describe('The corresponding answer.'),
  vectorId: z.string().nullable().describe('Vector database identifier.'),
  createdAt: z.string().nullable().describe('Creation timestamp.'),
  updatedAt: z.string().nullable().describe('Last update timestamp.')
});

export let listUpdatedAnswers = SlateTool.create(spec, {
  name: 'List Updated Answers',
  key: 'list_updated_answers',
  description: `Retrieve all custom question-and-answer pairs (updated answers) configured for a chatbot. These override or supplement the chatbot's trained knowledge for specific questions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chatbotId: z.string().describe('The ID of the chatbot.')
    })
  )
  .output(
    z.object({
      updatedAnswers: z.array(updatedAnswerSchema).describe('List of updated answer records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getUpdatedAnswers(ctx.input.chatbotId);

    let answers = Array.isArray(data) ? data : [];

    let mapped = answers.map((a: any) => ({
      answerId: a.id?.toString() ?? '',
      chatbotId: a.chatbot_id?.toString() ?? '',
      question: a.question ?? '',
      suggestedAnswer: a.suggested_answer ?? '',
      vectorId: a.vector_id?.toString() ?? null,
      createdAt: a.created_at ?? null,
      updatedAt: a.updated_at ?? null
    }));

    return {
      output: {
        updatedAnswers: mapped
      },
      message: `Retrieved ${mapped.length} updated answer(s).`
    };
  })
  .build();

export let createUpdatedAnswer = SlateTool.create(spec, {
  name: 'Create Updated Answer',
  key: 'create_updated_answer',
  description: `Create a custom question-and-answer pair for a chatbot. This overrides or supplements the chatbot's trained knowledge so it returns the specified answer when asked the given question. Useful for correcting or improving specific responses.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatbotId: z.string().describe('The ID of the chatbot.'),
      question: z.string().describe('The question to create a custom answer for.'),
      suggestedAnswer: z
        .string()
        .describe('The answer the chatbot should return for this question.')
    })
  )
  .output(updatedAnswerSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.createUpdatedAnswer(ctx.input.chatbotId, {
      question: ctx.input.question,
      suggestedAnswer: ctx.input.suggestedAnswer
    });

    let finetune = data.finetune ?? data;

    return {
      output: {
        answerId: finetune.id?.toString() ?? '',
        chatbotId: finetune.chatbot_id?.toString() ?? ctx.input.chatbotId,
        question: finetune.question ?? ctx.input.question,
        suggestedAnswer: finetune.suggested_answer ?? ctx.input.suggestedAnswer,
        vectorId: finetune.vector_id?.toString() ?? null,
        createdAt: finetune.created_at ?? null,
        updatedAt: finetune.updated_at ?? null
      },
      message: `Created updated answer for question: "${ctx.input.question}".`
    };
  })
  .build();

export let deleteUpdatedAnswer = SlateTool.create(spec, {
  name: 'Delete Updated Answer',
  key: 'delete_updated_answer',
  description: `Delete an existing custom question-and-answer pair from a chatbot. After deletion, the chatbot will revert to using its trained knowledge for that question.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      chatbotId: z.string().describe('The ID of the chatbot.'),
      answerId: z.string().describe('The ID of the updated answer to delete.')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.deleteUpdatedAnswer(ctx.input.chatbotId, ctx.input.answerId);

    return {
      output: {
        message: data.message ?? 'Updated answer deleted successfully.'
      },
      message: `Deleted updated answer **${ctx.input.answerId}**.`
    };
  })
  .build();
