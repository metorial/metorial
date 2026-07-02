import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateGage = SlateTool.create(spec, {
  name: 'Update Gage',
  key: 'update_gage',
  description: `Update an existing gage record in GageList.
Provide the gage ID and any fields to update. Only the specified fields will be changed.`,
  instructions: ['At least one field besides gageId must be provided to update.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      gageId: z.number().describe('ID of the gage to update'),
      status: z
        .enum([
          'Active',
          'Employee Owned',
          'Inactive',
          'Lost',
          'Out of Calibration',
          'Out for Repair',
          'Reference Only',
          'Retired'
        ])
        .optional()
        .describe('Updated status of the gage'),
      manufacturer: z.string().optional().describe('Updated manufacturer name'),
      type: z.string().optional().describe('Updated type of the gage'),
      model: z.string().optional().describe('Updated model identifier'),
      serialNumber: z.string().optional().describe('Updated serial number'),
      controlNumber: z.string().optional().describe('Updated control number'),
      condition: z.enum(['New', 'Repaired', 'Used']).optional().describe('Updated condition'),
      lastCalibrationDate: z
        .string()
        .optional()
        .describe('Updated last calibration date in ISO-8601 format'),
      calibrationDueDate: z
        .string()
        .optional()
        .describe('Updated next calibration due date in ISO-8601 format'),
      calibrationInstructions: z
        .string()
        .optional()
        .describe('Updated calibration instructions'),
      location: z.string().optional().describe('Updated physical location'),
      responsibleUser: z.string().optional().describe('Updated responsible person'),
      tolerance: z.string().optional().describe('Updated tolerance specification')
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

    let data: Record<string, any> = { Id: ctx.input.gageId };

    if (ctx.input.status !== undefined) data.Status = ctx.input.status;
    if (ctx.input.manufacturer !== undefined) data.Manufacturer = ctx.input.manufacturer;
    if (ctx.input.type !== undefined) data.Type = ctx.input.type;
    if (ctx.input.model !== undefined) data.Model = ctx.input.model;
    if (ctx.input.serialNumber !== undefined) data.SerialNumber = ctx.input.serialNumber;
    if (ctx.input.controlNumber !== undefined) data.ControlNumber = ctx.input.controlNumber;
    if (ctx.input.condition !== undefined) data.ConditionAquired = ctx.input.condition;
    if (ctx.input.lastCalibrationDate !== undefined)
      data.LastCalibrationDate = ctx.input.lastCalibrationDate;
    if (ctx.input.calibrationDueDate !== undefined)
      data.CalibrationDueDate = ctx.input.calibrationDueDate;
    if (ctx.input.calibrationInstructions !== undefined)
      data.CalibrationInstructions = ctx.input.calibrationInstructions;
    if (ctx.input.location !== undefined) data.Location = ctx.input.location;
    if (ctx.input.responsibleUser !== undefined)
      data.ResponsibleUser = ctx.input.responsibleUser;
    if (ctx.input.tolerance !== undefined) data.Tolerance = ctx.input.tolerance;

    let result = await client.updateGage(data);

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: `Updated gage **${ctx.input.gageId}** successfully.`
    };
  })
  .build();
