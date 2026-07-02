import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let entityAnnotationSchema = z.object({
  entity: z.string().describe('Entity name (e.g., "wit$datetime" or a custom entity name)'),
  start: z.number().describe('Start character position in the utterance text'),
  end: z.number().describe('End character position in the utterance text'),
  body: z.string().describe('The matched text segment'),
  entities: z.array(z.any()).optional().describe('Sub-entity annotations')
});

let traitAnnotationSchema = z.object({
  trait: z.string().describe('Trait name'),
  value: z.string().describe('Trait value for this utterance')
});

let utteranceSchema = z.object({
  text: z.string().describe('The utterance text'),
  intent: z.string().optional().describe('Associated intent name'),
  entities: z.array(entityAnnotationSchema).optional().describe('Entity annotations'),
  traits: z.array(traitAnnotationSchema).optional().describe('Trait annotations')
});

export let listUtterances = SlateTool.create(spec, {
  name: 'List Utterances',
  key: 'list_utterances',
  description: `List training utterances (samples) in the Wit.ai app. Returns annotated utterances with their intent, entity, and trait labels. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of utterances to return (default: 10)'),
      offset: z.number().optional().describe('Number of utterances to skip for pagination')
    })
  )
  .output(
    z.object({
      utterances: z.array(utteranceSchema).describe('List of training utterances')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let utterances = await client.listUtterances(ctx.input.limit, ctx.input.offset);

    return {
      output: {
        utterances: (utterances ?? []).map((u: Record<string, unknown>) => ({
          text: u.text,
          intent: u.intent as string | undefined,
          entities: u.entities as Record<string, unknown>[] | undefined,
          traits: u.traits as Record<string, unknown>[] | undefined
        }))
      },
      message: `Retrieved **${(utterances ?? []).length}** utterance(s).`
    };
  })
  .build();

export let trainUtterances = SlateTool.create(spec, {
  name: 'Train Utterances',
  key: 'train_utterances',
  description: `Submit training utterances (samples) to train the Wit.ai NLU model. Each utterance can include intent labels, entity annotations with character positions, and trait annotations. Useful for bulk importing training data.`,
  instructions: [
    'Entity annotations require `start` and `end` character positions that correspond to the text segment.',
    'The `body` field should match the substring of `text` from `start` to `end`.'
  ],
  constraints: ['Rate limited to 200 utterances per minute.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      utterances: z
        .array(
          z.object({
            text: z.string().describe('The utterance text'),
            intent: z.string().optional().describe('Intent to associate with this utterance'),
            entities: z
              .array(entityAnnotationSchema)
              .optional()
              .describe('Entity annotations with character positions'),
            traits: z.array(traitAnnotationSchema).optional().describe('Trait annotations')
          })
        )
        .describe('Array of training utterances to submit')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the training data was sent successfully'),
      count: z.number().describe('Number of utterances submitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    await client.trainUtterances(ctx.input.utterances);

    return {
      output: {
        sent: true,
        count: ctx.input.utterances.length
      },
      message: `Submitted **${ctx.input.utterances.length}** utterance(s) for training.`
    };
  })
  .build();

export let deleteUtterances = SlateTool.create(spec, {
  name: 'Delete Utterances',
  key: 'delete_utterances',
  description: `Delete training utterances from the Wit.ai app by their text content. Useful for cleaning up or correcting training data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      texts: z.array(z.string()).describe('List of utterance texts to delete')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the delete request was sent successfully'),
      count: z.number().describe('Number of utterances targeted for deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    await client.deleteUtterances(ctx.input.texts);

    return {
      output: {
        sent: true,
        count: ctx.input.texts.length
      },
      message: `Requested deletion of **${ctx.input.texts.length}** utterance(s).`
    };
  })
  .build();
