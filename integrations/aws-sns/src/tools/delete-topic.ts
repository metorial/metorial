import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTopic = SlateTool.create(spec, {
  name: 'Delete Topic',
  key: 'delete_topic',
  description: `Delete an SNS topic and all its subscriptions. This action is idempotent; deleting a non-existent topic does not cause an error. Previously sent messages may not be delivered after deletion.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      topicArn: z.string().describe('ARN of the topic to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    await client.deleteTopic(ctx.input.topicArn);

    return {
      output: { deleted: true },
      message: `Deleted topic \`${ctx.input.topicArn}\``
    };
  })
  .build();
