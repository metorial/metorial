import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCalibration = SlateTool.create(spec, {
  name: 'Get Calibration',
  key: 'get_calibration',
  description: `Retrieve a single calibration record by its ID from GageList.
Returns full details about the calibration including dates, results, equipment condition, and personnel.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      calibrationId: z.number().describe('ID of the calibration record to retrieve')
    })
  )
  .output(
    z.object({
      calibrationId: z.number().describe('ID of the calibration record'),
      recordNumber: z.string().optional().describe('Calibration record number'),
      equipmentRefId: z.number().optional().describe('ID of the associated gage'),
      equipmentAsFound: z.string().optional().describe('Equipment condition as found'),
      equipmentAsLeft: z.string().optional().describe('Equipment condition as left'),
      lastCalibrationDate: z.string().optional().describe('Date of this calibration'),
      calibrationDueDate: z.string().optional().describe('Next calibration due date'),
      calibrationTest: z.string().optional().describe('Calibration test details'),
      uncertainty: z.string().optional().describe('Measurement uncertainty'),
      adjustmentsRequired: z.string().optional().describe('Whether adjustments were required'),
      repairsRequired: z.string().optional().describe('Whether repairs were required'),
      type: z.string().optional().describe('Equipment type'),
      manufacturer: z.string().optional().describe('Manufacturer name'),
      model: z.string().optional().describe('Equipment model'),
      serialNumber: z.string().optional().describe('Serial number'),
      controlNumber: z.string().optional().describe('Control number'),
      tolerance: z.string().optional().describe('Tolerance specification'),
      location: z.string().optional().describe('Location'),
      responsibleUser: z.string().optional().describe('Person who performed calibration'),
      calibrationInstructions: z.string().optional().describe('Calibration instructions'),
      calibrationEnvironment: z.string().optional().describe('Calibration environment'),
      createdBy: z.string().optional().describe('Created by user'),
      updatedBy: z.string().optional().describe('Last updated by user'),
      createdDate: z.string().optional().describe('Date the record was created'),
      updatedDate: z.string().optional().describe('Date the record was last updated'),
      isDeleted: z.boolean().optional().describe('Whether the record is soft-deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCalibration(ctx.input.calibrationId);
    let cal = result.data;

    return {
      output: {
        calibrationId: cal.Id,
        recordNumber: cal.RecordNumber,
        equipmentRefId: cal.EquipmentRefId,
        equipmentAsFound: cal.EquipmentAsFound,
        equipmentAsLeft: cal.EquipmentAsLeft,
        lastCalibrationDate: cal.LastCalibrationDate,
        calibrationDueDate: cal.CalibrationDueDate,
        calibrationTest: cal.CalibrationTest,
        uncertainty: cal.Uncertainty,
        adjustmentsRequired: cal.AdjustmentsRequired,
        repairsRequired: cal.RepairsRequired,
        type: cal.Type,
        manufacturer: cal.Manufacturer,
        model: cal.Model,
        serialNumber: cal.SerialNumber,
        controlNumber: cal.ControlNumber,
        tolerance: cal.Tolerance,
        location: cal.Location,
        responsibleUser: cal.ResponsibleUser,
        calibrationInstructions: cal.CalibrationInstructions,
        calibrationEnvironment: cal.CalibrationEnvironment,
        createdBy: cal.CreatedBy,
        updatedBy: cal.UpdatedBy,
        createdDate: cal.CreatedDate,
        updatedDate: cal.UpdatedDate,
        isDeleted: cal.IsDeleted
      },
      message: `Retrieved calibration **${cal.Id}** (Record: ${cal.RecordNumber ?? 'N/A'}) for gage ${cal.EquipmentRefId ?? 'N/A'}.`
    };
  })
  .build();
