import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCalibration = SlateTool.create(spec, {
  name: 'Update Calibration',
  key: 'update_calibration',
  description: `Update an existing calibration record in GageList.
Provide the calibration ID and any fields to update. Only the specified fields will be changed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      calibrationId: z.number().describe('ID of the calibration record to update'),
      equipmentAsFound: z.string().optional().describe('Updated equipment condition as found'),
      equipmentAsLeft: z.string().optional().describe('Updated equipment condition as left'),
      lastCalibrationDate: z
        .string()
        .optional()
        .describe('Updated calibration date in ISO-8601 format'),
      calibrationDueDate: z
        .string()
        .optional()
        .describe('Updated next calibration due date in ISO-8601 format'),
      calibrationTest: z.string().optional().describe('Updated calibration test details'),
      uncertainty: z.string().optional().describe('Updated measurement uncertainty'),
      adjustmentsRequired: z
        .string()
        .optional()
        .describe('Updated adjustments required status'),
      repairsRequired: z.string().optional().describe('Updated repairs required status'),
      responsibleUser: z.string().optional().describe('Updated responsible person'),
      calibrationInstructions: z
        .string()
        .optional()
        .describe('Updated calibration instructions'),
      calibrationEnvironment: z.string().optional().describe('Updated calibration environment')
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

    let data: Record<string, any> = { Id: ctx.input.calibrationId };

    if (ctx.input.equipmentAsFound !== undefined)
      data.EquipmentAsFound = ctx.input.equipmentAsFound;
    if (ctx.input.equipmentAsLeft !== undefined)
      data.EquipmentAsLeft = ctx.input.equipmentAsLeft;
    if (ctx.input.lastCalibrationDate !== undefined)
      data.LastCalibrationDate = ctx.input.lastCalibrationDate;
    if (ctx.input.calibrationDueDate !== undefined)
      data.CalibrationDueDate = ctx.input.calibrationDueDate;
    if (ctx.input.calibrationTest !== undefined)
      data.CalibrationTest = ctx.input.calibrationTest;
    if (ctx.input.uncertainty !== undefined) data.Uncertainty = ctx.input.uncertainty;
    if (ctx.input.adjustmentsRequired !== undefined)
      data.AdjustmentsRequired = ctx.input.adjustmentsRequired;
    if (ctx.input.repairsRequired !== undefined)
      data.RepairsRequired = ctx.input.repairsRequired;
    if (ctx.input.responsibleUser !== undefined)
      data.ResponsibleUser = ctx.input.responsibleUser;
    if (ctx.input.calibrationInstructions !== undefined)
      data.CalibrationInstructions = ctx.input.calibrationInstructions;
    if (ctx.input.calibrationEnvironment !== undefined)
      data.CalibrationEnvironment = ctx.input.calibrationEnvironment;

    let result = await client.updateCalibration(data);

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: `Updated calibration record **${ctx.input.calibrationId}** successfully.`
    };
  })
  .build();
