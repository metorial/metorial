import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let startTraining = SlateTool.create(spec, {
  name: 'Start Training',
  key: 'start_training',
  description: `Trigger model training for a specific document type. After adding documents to the dataset, use this to build or update the extraction model. Training must complete before the model can be used for accurate data extraction.`,
  instructions: [
    'Ensure at least one document has been added to the dataset before triggering training',
    'Training may take some time to complete depending on the dataset size'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentTypeName: z.string().describe('Slug/name of the document type to train')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the training was triggered successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.startTraining({
      documentTypeName: ctx.input.documentTypeName
    });

    return {
      output: { success: true },
      message: `Training triggered for document type **${ctx.input.documentTypeName}**. Training may take some time to complete.`
    };
  })
  .build();
