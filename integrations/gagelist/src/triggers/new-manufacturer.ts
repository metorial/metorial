import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newManufacturer = SlateTrigger.create(spec, {
  name: 'New Manufacturer Created',
  key: 'new_manufacturer_created',
  description: 'Triggers when a new manufacturer entry is created in GageList.'
})
  .input(
    z.object({
      manufacturerId: z.number().describe('ID of the manufacturer'),
      name: z.string().optional().describe('Manufacturer name'),
      address: z.string().optional().describe('Physical address'),
      phone: z.string().optional().describe('Phone number'),
      fax: z.string().optional().describe('Fax number'),
      website: z.string().optional().describe('Website URL'),
      updatedDate: z.string().optional().describe('Date last updated')
    })
  )
  .output(
    z.object({
      manufacturerId: z.number().describe('ID of the new manufacturer'),
      name: z.string().optional().describe('Manufacturer name'),
      address: z.string().optional().describe('Physical address'),
      phone: z.string().optional().describe('Phone number'),
      fax: z.string().optional().describe('Fax number'),
      website: z.string().optional().describe('Website URL'),
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
      let result = await client.listManufacturers();
      let allManufacturers = result.data ?? [];

      let newManufacturers = allManufacturers
        .filter((m: any) => {
          let ts = Date.parse(m.UpdatedDate);
          return !Number.isNaN(ts) && ts > lastTs;
        })
        .sort((a: any, b: any) => Date.parse(a.UpdatedDate) - Date.parse(b.UpdatedDate));

      let maxTs = lastTs;
      for (let m of newManufacturers) {
        let ts = Date.parse(m.UpdatedDate);
        if (ts > maxTs) maxTs = ts;
      }

      let inputs = newManufacturers.map((m: any) => ({
        manufacturerId: m.Id,
        name: m.Name,
        address: m.Address,
        phone: m.Phone,
        fax: m.Fax,
        website: m.Website,
        updatedDate: m.UpdatedDate
      }));

      return {
        inputs,
        updatedState: { lastTs: maxTs }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'manufacturer.created',
        id: `manufacturer-${ctx.input.manufacturerId}`,
        output: {
          manufacturerId: ctx.input.manufacturerId,
          name: ctx.input.name,
          address: ctx.input.address,
          phone: ctx.input.phone,
          fax: ctx.input.fax,
          website: ctx.input.website,
          updatedDate: ctx.input.updatedDate
        }
      };
    }
  })
  .build();
