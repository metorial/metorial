import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCalibration = SlateTool.create(spec, {
  name: 'Create Calibration',
  key: 'create_calibration',
  description: `Create a new calibration record for a gage in GageList.
Use this to log a calibration event including dates, results, equipment condition, and responsible personnel.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      equipmentRefId: z.number().describe('ID of the gage this calibration belongs to'),
      lastCalibrationDate: z
        .string()
        .optional()
        .describe('Calibration date in ISO-8601 format'),
      calibrationDueDate: z
        .string()
        .optional()
        .describe('Next calibration due date in ISO-8601 format'),
      equipmentAsFound: z.string().optional().describe('Equipment condition as found'),
      equipmentAsLeft: z.string().optional().describe('Equipment condition as left'),
      calibrationTest: z.string().optional().describe('Calibration test details'),
      uncertainty: z.string().optional().describe('Measurement uncertainty'),
      adjustmentsRequired: z.string().optional().describe('Whether adjustments were required'),
      repairsRequired: z.string().optional().describe('Whether repairs were required'),
      responsibleUser: z.string().optional().describe('Person who performed the calibration'),
      calibrationInstructions: z.string().optional().describe('Calibration instructions used'),
      calibrationEnvironment: z.string().optional().describe('Environment during calibration'),
      calibrationTestMode: z.string().optional().describe('Test mode used'),
      conditionReceived: z
        .string()
        .optional()
        .describe('Condition when received for calibration'),
      type: z.string().optional().describe('Equipment type'),
      manufacturer: z.string().optional().describe('Equipment manufacturer'),
      model: z.string().optional().describe('Equipment model'),
      serialNumber: z.string().optional().describe('Equipment serial number'),
      controlNumber: z.string().optional().describe('Equipment control number'),
      tolerance: z.string().optional().describe('Tolerance specification'),
      location: z.string().optional().describe('Location where calibration was performed')
    })
  )
  .output(
    z.object({
      calibrationId: z.number().describe('ID of the newly created calibration record'),
      success: z.boolean().describe('Whether the operation was successful'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createCalibration({
      EquipmentRefId: ctx.input.equipmentRefId,
      LastCalibrationDate: ctx.input.lastCalibrationDate,
      CalibrationDueDate: ctx.input.calibrationDueDate,
      EquipmentAsFound: ctx.input.equipmentAsFound,
      EquipmentAsLeft: ctx.input.equipmentAsLeft,
      CalibrationTest: ctx.input.calibrationTest,
      Uncertainty: ctx.input.uncertainty,
      AdjustmentsRequired: ctx.input.adjustmentsRequired,
      RepairsRequired: ctx.input.repairsRequired,
      ResponsibleUser: ctx.input.responsibleUser,
      CalibrationInstructions: ctx.input.calibrationInstructions,
      CalibrationEnvironment: ctx.input.calibrationEnvironment,
      CalibrationTestMode: ctx.input.calibrationTestMode,
      ConditionReceived: ctx.input.conditionReceived,
      Type: ctx.input.type,
      Manufacturer: ctx.input.manufacturer,
      Model: ctx.input.model,
      SerialNumber: ctx.input.serialNumber,
      ControlNumber: ctx.input.controlNumber,
      Tolerance: ctx.input.tolerance,
      Location: ctx.input.location
    });

    return {
      output: {
        calibrationId: result.data,
        success: result.success,
        message: result.message
      },
      message: `Created calibration record **${result.data}** for gage ${ctx.input.equipmentRefId}.`
    };
  })
  .build();
