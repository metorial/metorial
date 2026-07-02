import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGages = SlateTool.create(spec, {
  name: 'List Gages',
  key: 'list_gages',
  description: `Retrieve a paginated list of gage records from GageList.
Use offset and limit to paginate through results. Returns basic gage information including status, type, and calibration dates.`,
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
      gages: z
        .array(
          z.object({
            gageId: z.number().describe('ID of the gage'),
            status: z.string().optional().describe('Status of the gage'),
            type: z.string().optional().describe('Type of the gage'),
            manufacturer: z.string().optional().describe('Manufacturer name'),
            model: z.string().optional().describe('Model identifier'),
            serialNumber: z.string().optional().describe('Serial number'),
            controlNumber: z.string().optional().describe('Control number'),
            lastCalibrationDate: z.string().optional().describe('Last calibration date'),
            calibrationDueDate: z.string().optional().describe('Next calibration due date'),
            createdDate: z.string().optional().describe('Record creation date'),
            updatedDate: z.string().optional().describe('Last update date')
          })
        )
        .describe('List of gage records'),
      totalReturned: z.number().describe('Number of gages returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listGages({
      start: ctx.input.offset,
      recordNumber: ctx.input.limit
    });

    let gages = (result.data ?? []).map((g: any) => ({
      gageId: g.Id,
      status: g.Status,
      type: g.Type,
      manufacturer: g.Manufacturer,
      model: g.Model,
      serialNumber: g.SerialNumber,
      controlNumber: g.ControlNumber,
      lastCalibrationDate: g.LastCalibrationDate,
      calibrationDueDate: g.CalibrationDueDate,
      createdDate: g.CreatedDate,
      updatedDate: g.UpdatedDate
    }));

    return {
      output: {
        gages,
        totalReturned: gages.length
      },
      message: `Retrieved **${gages.length}** gage(s) starting from offset ${ctx.input.offset}.`
    };
  })
  .build();
