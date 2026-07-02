import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let itemTypeMap: Record<string, string> = {
  Project: 'project',
  Subproject: 'subproject',
  ProjectRequest: 'project_request',
  ProjectRequestEquipment: 'project_request_equipment',
  ProjectType: 'project_type',
  Status: 'status',
  Appointment: 'appointment',
  AppointmentCrew: 'appointment_crew',
  Equipment: 'equipment',
  EquipmentSetContent: 'equipment_set_content',
  ProjectEquipment: 'project_equipment',
  ProjectEquipmentGroup: 'project_equipment_group',
  SerialNumber: 'serial_number',
  StockMovement: 'stock_movement',
  StockLocation: 'stock_location',
  Accessory: 'accessory',
  Crew: 'crew',
  ProjectCrew: 'project_crew',
  CrewAvailability: 'crew_availability',
  CrewRate: 'crew_rate',
  CrewRateFactor: 'crew_rate_factor',
  TimeRegistration: 'time_registration',
  TimeRegistrationActivity: 'time_registration_activity',
  ProjectFunction: 'project_function',
  ProjectFunctionGroup: 'project_function_group',
  Contact: 'contact',
  ContactPerson: 'contact_person',
  Factuur: 'invoice',
  InvoiceLine: 'invoice_line',
  Quotation: 'quotation',
  Contract: 'contract',
  ProjectCost: 'project_cost',
  Ledger: 'ledger',
  TaxClass: 'tax_class',
  Subrental: 'subrental',
  SubrentalEquipmentGroup: 'subrental_equipment_group',
  SubrentalEquipment: 'subrental_equipment',
  ProjectVehicle: 'project_vehicle',
  Vehicle: 'vehicle',
  File: 'file',
  Folder: 'folder',
  Repair: 'repair'
};

let eventTypeMap: Record<string, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted'
};

export let rentmanEvent = SlateTrigger.create(spec, {
  name: 'Rentman Event',
  key: 'rentman_event',
  description:
    'Fires when any item is created, updated, or deleted in Rentman. Covers all resource types including projects, contacts, equipment, crew, invoices, subrentals, and more. Webhooks must be configured manually in Rentman under Configuration > Integrations > Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('The event type (create, update, delete)'),
      itemType: z
        .string()
        .describe('The Rentman item type (e.g. Project, Contact, Equipment)'),
      itemIds: z.array(z.number()).describe('IDs of the affected items'),
      itemRefs: z
        .array(z.string())
        .optional()
        .describe('API reference paths for the affected items'),
      parentType: z.string().optional().describe('Parent item type if applicable'),
      parentId: z.number().optional().describe('Parent item ID if applicable'),
      parentRef: z.string().optional().describe('Parent API reference if applicable'),
      account: z.string().describe('Rentman account name'),
      userId: z.number().optional().describe('ID of the user who triggered the event'),
      userRef: z.string().optional().describe('API reference of the triggering user'),
      eventDate: z.string().describe('ISO 8601 timestamp of the event')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Normalized event type (created, updated, deleted)'),
      itemType: z.string().describe('Normalized item type in snake_case'),
      rawItemType: z.string().describe('Original Rentman item type'),
      itemIds: z.array(z.number()).describe('IDs of the affected items'),
      itemRefs: z.array(z.string()).optional().describe('API reference paths'),
      parentType: z.string().optional(),
      parentId: z.number().optional(),
      parentRef: z.string().optional(),
      account: z.string().describe('Rentman account name'),
      userId: z.number().optional(),
      userRef: z.string().optional(),
      eventDate: z.string().describe('ISO 8601 timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.input.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body?.eventType || !body.itemType) {
        return { inputs: [] };
      }

      let itemIds: number[] = [];
      let itemRefs: string[] = [];
      let parentType: string | undefined;
      let parentId: number | undefined;
      let parentRef: string | undefined;

      if (body.eventType === 'delete') {
        // For deletes, items is an array of integer IDs
        itemIds = Array.isArray(body.items) ? body.items : [];
      } else if (Array.isArray(body.items)) {
        // For create/update, items is an array of objects
        for (let item of body.items) {
          if (item.id) itemIds.push(item.id);
          if (item.ref) itemRefs.push(item.ref);
          if (item.parent && !parentType) {
            parentType = item.parent.itemType;
            parentId = item.parent.id;
            parentRef = item.parent.ref;
          }
        }
      }

      return {
        inputs: [
          {
            eventType: body.eventType,
            itemType: body.itemType,
            itemIds,
            itemRefs: itemRefs.length > 0 ? itemRefs : undefined,
            parentType,
            parentId,
            parentRef,
            account: body.account || '',
            userId: body.user?.id,
            userRef: body.user?.ref,
            eventDate: body.eventDate || new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let normalizedItemType =
        itemTypeMap[ctx.input.itemType] || ctx.input.itemType.toLowerCase();
      let normalizedEventType = eventTypeMap[ctx.input.eventType] || ctx.input.eventType;
      let eventTypeString = `${normalizedItemType}.${normalizedEventType}`;

      let eventId = `${ctx.input.account}-${ctx.input.itemType}-${ctx.input.eventType}-${ctx.input.itemIds.join(',')}-${ctx.input.eventDate}`;

      return {
        type: eventTypeString,
        id: eventId,
        output: {
          eventType: normalizedEventType,
          itemType: normalizedItemType,
          rawItemType: ctx.input.itemType,
          itemIds: ctx.input.itemIds,
          itemRefs: ctx.input.itemRefs,
          parentType: ctx.input.parentType,
          parentId: ctx.input.parentId,
          parentRef: ctx.input.parentRef,
          account: ctx.input.account,
          userId: ctx.input.userId,
          userRef: ctx.input.userRef,
          eventDate: ctx.input.eventDate
        }
      };
    }
  })
  .build();
