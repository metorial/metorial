import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDubbing = SlateTool.create(spec, {
  name: 'Delete Dubbing',
  key: 'delete_dubbing',
  description: `Delete an ElevenLabs dubbing project by ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      dubbingId: z.string().describe('ID of the dubbing project to delete')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Provider deletion status'),
      success: z.boolean().describe('Whether the deletion request succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);
    let result = (await client.deleteDubbing(ctx.input.dubbingId)) as Record<string, unknown>;

    return {
      output: {
        status: result.status as string | undefined,
        success: true
      },
      message: `Deleted dubbing project \`${ctx.input.dubbingId}\`.`
    };
  })
  .build();
