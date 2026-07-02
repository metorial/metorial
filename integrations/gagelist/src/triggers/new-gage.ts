import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newGage = SlateTrigger.create(spec, {
  name: 'New Gage Created',
  key: 'new_gage_created',
  description: 'Triggers when a new gage record is created in GageList.'
})
  .input(
    z.object({
      gageId: z.number().describe('ID of the gage'),
      status: z.string().optional().describe('Status of the gage'),
      type: z.string().optional().describe('Type of the gage'),
      manufacturer: z.string().optional().describe('Manufacturer name'),
      model: z.string().optional().describe('Model identifier'),
      serialNumber: z.string().optional().describe('Serial number'),
      controlNumber: z.string().optional().describe('Control number'),
      assetNumber: z.string().optional().describe('Asset number'),
      lastCalibrationDate: z.string().optional().describe('Last calibration date'),
      calibrationDueDate: z.string().optional().describe('Next calibration due date'),
      createdBy: z.string().optional().describe('Created by user'),
      createdDate: z.string().optional().describe('Date created'),
      updatedDate: z.string().optional().describe('Date last updated')
    })
  )
  .output(
    z.object({
      gageId: z.number().describe('ID of the new gage'),
      status: z.string().optional().describe('Status of the gage'),
      type: z.string().optional().describe('Type of the gage'),
      manufacturer: z.string().optional().describe('Manufacturer name'),
      model: z.string().optional().describe('Model identifier'),
      serialNumber: z.string().optional().describe('Serial number'),
      controlNumber: z.string().optional().describe('Control number'),
      assetNumber: z.string().optional().describe('Asset number'),
      lastCalibrationDate: z.string().optional().describe('Last calibration date'),
      calibrationDueDate: z.string().optional().describe('Next calibration due date'),
      createdBy: z.string().optional().describe('Created by user'),
      createdDate: z.string().optional().describe('Date created'),
      updatedDate: z.string().optional().describe('Date last updated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastTs: number = ctx.state?.lastTs ?? 0;
      let allGages = await client.getAllGages();

      let newGages = allGages
        .filter((g: any) => {
          let ts = Date.parse(g.CreatedDate);
          return !Number.isNaN(ts) && ts > lastTs;
        })
        .sort((a: any, b: any) => Date.parse(a.CreatedDate) - Date.parse(b.CreatedDate));

      let maxTs = lastTs;
      for (let g of newGages) {
        let ts = Date.parse(g.CreatedDate);
        if (ts > maxTs) maxTs = ts;
      }

      let inputs = newGages.map((g: any) => ({
        gageId: g.Id,
        status: g.Status,
        type: g.Type,
        manufacturer: g.Manufacturer,
        model: g.Model,
        serialNumber: g.SerialNumber,
        controlNumber: g.ControlNumber,
        assetNumber: g.AssetNo,
        lastCalibrationDate: g.LastCalibrationDate,
        calibrationDueDate: g.CalibrationDueDate,
        createdBy: g.CreatedBy,
        createdDate: g.CreatedDate,
        updatedDate: g.UpdatedDate
      }));

      return {
        inputs,
        updatedState: { lastTs: maxTs }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'gage.created',
        id: `gage-${ctx.input.gageId}`,
        output: {
          gageId: ctx.input.gageId,
          status: ctx.input.status,
          type: ctx.input.type,
          manufacturer: ctx.input.manufacturer,
          model: ctx.input.model,
          serialNumber: ctx.input.serialNumber,
          controlNumber: ctx.input.controlNumber,
          assetNumber: ctx.input.assetNumber,
          lastCalibrationDate: ctx.input.lastCalibrationDate,
          calibrationDueDate: ctx.input.calibrationDueDate,
          createdBy: ctx.input.createdBy,
          createdDate: ctx.input.createdDate,
          updatedDate: ctx.input.updatedDate
        }
      };
    }
  })
  .build();
