import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCalibration = SlateTool.create(spec, {
  name: 'Delete Calibration',
  key: 'delete_calibration',
  description: `Delete a calibration record from GageList by its ID.
This permanently removes the calibration record.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      calibrationId: z.number().describe('ID of the calibration record to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteCalibration(ctx.input.calibrationId);

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: `Deleted calibration record **${ctx.input.calibrationId}**.`
    };
  })
  .build();
