import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateCalibrationCertificate = SlateTool.create(spec, {
  name: 'Generate Calibration Certificate',
  key: 'generate_calibration_certificate',
  description: `Generate a calibration certificate for a specific calibration record.
Returns the certificate data (typically a PDF) for the given calibration record.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      calibrationId: z
        .number()
        .describe('ID of the calibration record to generate a certificate for')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the certificate was generated successfully'),
      certificateData: z.any().optional().describe('Certificate data returned by the API'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCalibrationCertificate(ctx.input.calibrationId);

    return {
      output: {
        success: result.success ?? true,
        certificateData: result.data,
        message: result.message
      },
      message: `Generated calibration certificate for calibration record **${ctx.input.calibrationId}**.`
    };
  })
  .build();
