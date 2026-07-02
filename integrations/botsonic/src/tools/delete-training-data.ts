import { SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTrainingData = SlateTool.create(spec, {
  name: 'Delete Training Data',
  key: 'delete_training_data',
  description: `Delete a specific training data entry from a bot's knowledge base. Use the "List Training Data" tool to find the data ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      dataId: z.string().describe('The unique identifier of the training data entry to delete')
    })
  )
  .output(
    z.object({
      dataId: z.string().describe('ID of the deleted data entry'),
      botId: z.string().describe('Bot the data belonged to'),
      title: z.string().describe('Title of the deleted data'),
      status: z.string().describe('Final status of the data entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    let result = await client.deleteBotData(ctx.input.dataId);

    return {
      output: {
        dataId: result.id,
        botId: result.bot_id,
        title: result.title || '',
        status: result.status || 'deleting'
      },
      message: `Deleted training data **${result.id}** ("${result.title || 'untitled'}") from bot ${result.bot_id}.`
    };
  })
  .build();
