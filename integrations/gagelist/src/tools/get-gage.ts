import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGage = SlateTool.create(spec, {
  name: 'Get Gage',
  key: 'get_gage',
  description: `Retrieve a single gage record by its ID from GageList.
Returns all details about the gage including identification, calibration dates, manufacturer, status, and more.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      gageId: z.number().describe('ID of the gage to retrieve')
    })
  )
  .output(
    z.object({
      gageId: z.number().describe('ID of the gage'),
      status: z.string().optional().describe('Current status of the gage'),
      type: z.string().optional().describe('Type of the gage'),
      manufacturer: z.string().optional().describe('Manufacturer name'),
      model: z.string().optional().describe('Model identifier'),
      serialNumber: z.string().optional().describe('Serial number'),
      controlNumber: z.string().optional().describe('Control number'),
      assetNumber: z.string().optional().describe('Asset number'),
      lastCalibrationDate: z.string().optional().describe('Last calibration date'),
      calibrationDueDate: z.string().optional().describe('Next calibration due date'),
      location: z.string().optional().describe('Physical location'),
      responsibleUser: z.string().optional().describe('Responsible person'),
      tolerance: z.string().optional().describe('Tolerance specification'),
      rangeOrSize: z.string().optional().describe('Range or size'),
      unitOfMeasure: z.string().optional().describe('Unit of measure'),
      typesMeasurement: z.string().optional().describe('Types of measurement'),
      condition: z.string().optional().describe('Condition when acquired'),
      masterStandard: z.string().optional().describe('Whether this is a master standard'),
      calibrationInstructions: z.string().optional().describe('Calibration instructions'),
      calibrationEnvironment: z.string().optional().describe('Calibration environment'),
      calibrationTestMode: z.string().optional().describe('Calibration test mode'),
      interval: z.string().optional().describe('Calibration interval'),
      years: z.number().optional().describe('Interval years component'),
      months: z.number().optional().describe('Interval months component'),
      days: z.number().optional().describe('Interval days component'),
      purchasePrice: z.number().optional().describe('Purchase price'),
      createdBy: z.string().optional().describe('Created by user'),
      updatedBy: z.string().optional().describe('Last updated by user'),
      createdDate: z.string().optional().describe('Date the record was created'),
      updatedDate: z.string().optional().describe('Date the record was last updated'),
      isDeleted: z.boolean().optional().describe('Whether the gage is soft-deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getGage(ctx.input.gageId);
    let gage = result.data;

    return {
      output: {
        gageId: gage.Id,
        status: gage.Status,
        type: gage.Type,
        manufacturer: gage.Manufacturer,
        model: gage.Model,
        serialNumber: gage.SerialNumber,
        controlNumber: gage.ControlNumber,
        assetNumber: gage.AssetNo,
        lastCalibrationDate: gage.LastCalibrationDate,
        calibrationDueDate: gage.CalibrationDueDate,
        location: gage.Location,
        responsibleUser: gage.ResponsibleUser,
        tolerance: gage.Tolerance,
        rangeOrSize: gage.RangeOrSize,
        unitOfMeasure: gage.UnitOfMeasure,
        typesMeasurement: gage.TypesMeasurement,
        condition: gage.ConditionAquired,
        masterStandard: gage.MasterStandard,
        calibrationInstructions: gage.CalibrationInstructions,
        calibrationEnvironment: gage.CalibrationEnvironment,
        calibrationTestMode: gage.CalibrationTestMode,
        interval: gage.Interval,
        years: gage.Years,
        months: gage.Months,
        days: gage.Days,
        purchasePrice: gage.PurchasePrice,
        createdBy: gage.CreatedBy,
        updatedBy: gage.UpdatedBy,
        createdDate: gage.CreatedDate,
        updatedDate: gage.UpdatedDate,
        isDeleted: gage.IsDeleted
      },
      message: `Retrieved gage **${gage.Id}** — Status: ${gage.Status ?? 'N/A'}, Type: ${gage.Type ?? 'N/A'}.`
    };
  })
  .build();
