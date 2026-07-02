import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCalibrations = SlateTool.create(spec, {
  name: 'List Calibrations',
  key: 'list_calibrations',
  description: `Retrieve a paginated list of calibration records from GageList.
Returns calibration records with their dates, equipment references, and key details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().default(0).describe('Starting record offset (0-based)'),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe('Maximum number of records to return (default 50)')
    })
  )
  .output(
    z.object({
      calibrations: z
        .array(
          z.object({
            calibrationId: z.number().describe('ID of the calibration record'),
            recordNumber: z.string().optional().describe('Calibration record number'),
            equipmentRefId: z.number().optional().describe('ID of the associated gage'),
            type: z.string().optional().describe('Equipment type'),
            manufacturer: z.string().optional().describe('Manufacturer name'),
            controlNumber: z.string().optional().describe('Control number'),
            serialNumber: z.string().optional().describe('Serial number'),
            createdDate: z.string().optional().describe('Record creation date'),
            updatedDate: z.string().optional().describe('Last update date')
          })
        )
        .describe('List of calibration records'),
      totalReturned: z.number().describe('Number of calibrations returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCalibrations({
      start: ctx.input.offset,
      recordNumber: ctx.input.limit
    });

    let calibrations = (result.data ?? []).map((c: any) => ({
      calibrationId: c.Id,
      recordNumber: c.RecordNumber,
      equipmentRefId: c.EquipmentRefId,
      type: c.Type,
      manufacturer: c.Manufacturer,
      controlNumber: c.ControlNumber,
      serialNumber: c.SerialNumber,
      createdDate: c.CreatedDate,
      updatedDate: c.UpdatedDate
    }));

    return {
      output: {
        calibrations,
        totalReturned: calibrations.length
      },
      message: `Retrieved **${calibrations.length}** calibration record(s) starting from offset ${ctx.input.offset}.`
    };
  })
  .build();
