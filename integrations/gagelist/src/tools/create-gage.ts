import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createGage = SlateTool.create(spec, {
  name: 'Create Gage',
  key: 'create_gage',
  description: `Create a new gage (measurement equipment) record in GageList.
Use this to register new equipment for calibration tracking. Provide the gage status, type, manufacturer, and other identifying details.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
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
        .describe('Status of the gage'),
      manufacturer: z.string().optional().describe('Manufacturer name of the gage'),
      type: z.string().optional().describe('Type of the gage, e.g. "Caliper", "Flow Meter"'),
      model: z.string().optional().describe('Model identifier of the gage'),
      serialNumber: z.string().optional().describe('Serial number of the gage'),
      controlNumber: z.string().optional().describe('Control number of the gage'),
      assetNumber: z.string().optional().describe('Asset number of the gage'),
      condition: z
        .enum(['New', 'Repaired', 'Used'])
        .optional()
        .describe('Condition when acquired'),
      lastCalibrationDate: z
        .string()
        .optional()
        .describe('Last calibration date in ISO-8601 format, e.g. "2024-03-15T00:00:00Z"'),
      calibrationDueDate: z
        .string()
        .optional()
        .describe('Next calibration due date in ISO-8601 format'),
      calibrationInstructions: z
        .string()
        .optional()
        .describe('Calibration instructions for the gage'),
      location: z.string().optional().describe('Physical location of the gage'),
      responsibleUser: z.string().optional().describe('Person responsible for the gage'),
      tolerance: z.string().optional().describe('Tolerance specification'),
      rangeOrSize: z.string().optional().describe('Range or size of the gage'),
      unitOfMeasure: z.string().optional().describe('Unit of measure'),
      typesMeasurement: z.string().optional().describe('Types of measurement'),
      masterStandard: z
        .string()
        .optional()
        .describe('Whether this is a master standard, e.g. "Yes" or "No"'),
      purchasePrice: z.number().optional().describe('Purchase price of the gage')
    })
  )
  .output(
    z.object({
      gageId: z.number().describe('ID of the newly created gage'),
      success: z.boolean().describe('Whether the operation was successful'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createGage({
      Status: ctx.input.status,
      Manufacturer: ctx.input.manufacturer,
      Type: ctx.input.type,
      Model: ctx.input.model,
      SerialNumber: ctx.input.serialNumber,
      ControlNumber: ctx.input.controlNumber,
      AssetNo: ctx.input.assetNumber,
      ConditionAquired: ctx.input.condition,
      LastCalibrationDate: ctx.input.lastCalibrationDate,
      CalibrationDueDate: ctx.input.calibrationDueDate,
      CalibrationInstructions: ctx.input.calibrationInstructions,
      Location: ctx.input.location,
      ResponsibleUser: ctx.input.responsibleUser,
      Tolerance: ctx.input.tolerance,
      RangeOrSize: ctx.input.rangeOrSize,
      UnitOfMeasure: ctx.input.unitOfMeasure,
      TypesMeasurement: ctx.input.typesMeasurement,
      MasterStandard: ctx.input.masterStandard,
      PurchasePrice: ctx.input.purchasePrice
    });

    return {
      output: {
        gageId: result.data,
        success: result.success,
        message: result.message
      },
      message: `Created gage with ID **${result.data}**${ctx.input.type ? ` (type: ${ctx.input.type})` : ''}.`
    };
  })
  .build();
