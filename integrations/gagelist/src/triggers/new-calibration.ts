import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newCalibration = SlateTrigger.create(spec, {
  name: 'New Calibration Created',
  key: 'new_calibration_created',
  description: 'Triggers when a new calibration record is created in GageList.'
})
  .input(
    z.object({
      calibrationId: z.number().describe('ID of the calibration record'),
      recordNumber: z.string().optional().describe('Calibration record number'),
      equipmentRefId: z.number().optional().describe('ID of the associated gage'),
      type: z.string().optional().describe('Equipment type'),
      manufacturer: z.string().optional().describe('Manufacturer name'),
      serialNumber: z.string().optional().describe('Serial number'),
      controlNumber: z.string().optional().describe('Control number'),
      responsibleUser: z.string().optional().describe('Person who performed calibration'),
      createdBy: z.string().optional().describe('Created by user'),
      createdDate: z.string().optional().describe('Date created'),
      updatedDate: z.string().optional().describe('Date last updated')
    })
  )
  .output(
    z.object({
      calibrationId: z.number().describe('ID of the new calibration record'),
      recordNumber: z.string().optional().describe('Calibration record number'),
      equipmentRefId: z.number().optional().describe('ID of the associated gage'),
      type: z.string().optional().describe('Equipment type'),
      manufacturer: z.string().optional().describe('Manufacturer name'),
      serialNumber: z.string().optional().describe('Serial number'),
      controlNumber: z.string().optional().describe('Control number'),
      responsibleUser: z.string().optional().describe('Person who performed calibration'),
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
      let allCalibrations = await client.getAllCalibrations();

      let newCalibrations = allCalibrations
        .filter((c: any) => {
          let ts = Date.parse(c.CreatedDate);
          return !Number.isNaN(ts) && ts > lastTs;
        })
        .sort((a: any, b: any) => Date.parse(a.CreatedDate) - Date.parse(b.CreatedDate));

      let maxTs = lastTs;
      for (let c of newCalibrations) {
        let ts = Date.parse(c.CreatedDate);
        if (ts > maxTs) maxTs = ts;
      }

      let inputs = newCalibrations.map((c: any) => ({
        calibrationId: c.Id,
        recordNumber: c.RecordNumber,
        equipmentRefId: c.EquipmentRefId,
        type: c.Type,
        manufacturer: c.Manufacturer,
        serialNumber: c.SerialNumber,
        controlNumber: c.ControlNumber,
        responsibleUser: c.ResponsibleUser,
        createdBy: c.CreatedBy,
        createdDate: c.CreatedDate,
        updatedDate: c.UpdatedDate
      }));

      return {
        inputs,
        updatedState: { lastTs: maxTs }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'calibration.created',
        id: `calibration-${ctx.input.calibrationId}`,
        output: {
          calibrationId: ctx.input.calibrationId,
          recordNumber: ctx.input.recordNumber,
          equipmentRefId: ctx.input.equipmentRefId,
          type: ctx.input.type,
          manufacturer: ctx.input.manufacturer,
          serialNumber: ctx.input.serialNumber,
          controlNumber: ctx.input.controlNumber,
          responsibleUser: ctx.input.responsibleUser,
          createdBy: ctx.input.createdBy,
          createdDate: ctx.input.createdDate,
          updatedDate: ctx.input.updatedDate
        }
      };
    }
  })
  .build();
