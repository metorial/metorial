import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listManufacturers = SlateTool.create(spec, {
  name: 'List Manufacturers',
  key: 'list_manufacturers',
  description: `Retrieve all manufacturer entries from GageList.
Returns the full list of manufacturers available in your account, including their contact details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      manufacturers: z
        .array(
          z.object({
            manufacturerId: z.number().describe('ID of the manufacturer'),
            name: z.string().optional().describe('Manufacturer name'),
            address: z.string().optional().describe('Physical address'),
            phone: z.string().optional().describe('Phone number'),
            fax: z.string().optional().describe('Fax number'),
            website: z.string().optional().describe('Website URL'),
            updatedDate: z.string().optional().describe('Last update date')
          })
        )
        .describe('List of manufacturers'),
      totalReturned: z.number().describe('Number of manufacturers returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listManufacturers();

    let manufacturers = (result.data ?? []).map((m: any) => ({
      manufacturerId: m.Id,
      name: m.Name,
      address: m.Address,
      phone: m.Phone,
      fax: m.Fax,
      website: m.Website,
      updatedDate: m.UpdatedDate
    }));

    return {
      output: {
        manufacturers,
        totalReturned: manufacturers.length
      },
      message: `Retrieved **${manufacturers.length}** manufacturer(s).`
    };
  })
  .build();

export let createManufacturer = SlateTool.create(spec, {
  name: 'Create Manufacturer',
  key: 'create_manufacturer',
  description: `Create a new manufacturer entry in GageList.
Manufacturers are referenced in gage records to identify the equipment maker.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Manufacturer name'),
      address: z.string().optional().describe('Physical address'),
      phone: z.string().optional().describe('Phone number'),
      fax: z.string().optional().describe('Fax number'),
      website: z.string().optional().describe('Website URL')
    })
  )
  .output(
    z.object({
      manufacturerId: z.number().describe('ID of the newly created manufacturer'),
      success: z.boolean().describe('Whether the operation was successful'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addManufacturer({
      Name: ctx.input.name,
      Address: ctx.input.address,
      Phone: ctx.input.phone,
      Fax: ctx.input.fax,
      Website: ctx.input.website
    });

    return {
      output: {
        manufacturerId: result.data,
        success: result.success,
        message: result.message
      },
      message: `Created manufacturer **${ctx.input.name}** with ID ${result.data}.`
    };
  })
  .build();

export let updateManufacturer = SlateTool.create(spec, {
  name: 'Update Manufacturer',
  key: 'update_manufacturer',
  description: `Update an existing manufacturer entry in GageList.
Provide the manufacturer ID and any fields to update.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      manufacturerId: z.number().describe('ID of the manufacturer to update'),
      name: z.string().optional().describe('Updated manufacturer name'),
      address: z.string().optional().describe('Updated physical address'),
      phone: z.string().optional().describe('Updated phone number'),
      fax: z.string().optional().describe('Updated fax number'),
      website: z.string().optional().describe('Updated website URL')
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

    let data: Record<string, any> = { Id: ctx.input.manufacturerId };
    if (ctx.input.name !== undefined) data.Name = ctx.input.name;
    if (ctx.input.address !== undefined) data.Address = ctx.input.address;
    if (ctx.input.phone !== undefined) data.Phone = ctx.input.phone;
    if (ctx.input.fax !== undefined) data.Fax = ctx.input.fax;
    if (ctx.input.website !== undefined) data.Website = ctx.input.website;

    let result = await client.updateManufacturer(data);

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: `Updated manufacturer **${ctx.input.manufacturerId}** successfully.`
    };
  })
  .build();

export let deleteManufacturer = SlateTool.create(spec, {
  name: 'Delete Manufacturer',
  key: 'delete_manufacturer',
  description: `Delete a manufacturer entry from GageList by its ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      manufacturerId: z.number().describe('ID of the manufacturer to delete')
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

    let result = await client.deleteManufacturer(ctx.input.manufacturerId);

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: `Deleted manufacturer **${ctx.input.manufacturerId}**.`
    };
  })
  .build();
