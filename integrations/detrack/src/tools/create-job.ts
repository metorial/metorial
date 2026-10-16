import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient, type JobData } from '../lib/client';
import { spec } from '../spec';

let itemSchema = z
  .object({
    sku: z.string().optional().describe('Stock keeping unit / barcode identifier'),
    description: z.string().optional().describe('Item description'),
    quantity: z.number().optional().describe('Quantity of the item'),
    unitOfMeasure: z.string().optional().describe('Unit of measure (e.g., EA, kg, box)'),
    comments: z.string().optional().describe('Item comments'),
    unitPrice: z.number().optional().describe('Unit price'),
    weight: z.number().optional().describe('Item weight'),
    serialNumber: z.string().optional().describe('Item serial number'),
    batchNumber: z.string().optional().describe('Production batch identifier'),
    expiryDate: z.string().optional().describe('Item expiry date (YYYY-MM-DD)'),
    poNumber: z.string().optional().describe('Purchase order number')
  })
  .describe('Item to include in the job');

export let createJobTool = SlateTool.create(spec, {
  name: 'Create Job',
  key: 'create_job',
  description: `Creates a new delivery or collection job in Detrack. A job represents a single delivery or collection task assigned to a driver. Supports attaching line items, scheduling, customer details, and driver assignment.`,
  instructions: [
    'Date must be in YYYY-MM-DD format.',
    'The doNumber must be unique per date. It serves as the primary identifier for the job together with the date.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      date: z.string().describe('Job date in YYYY-MM-DD format'),
      doNumber: z.string().describe('Delivery order number, unique per date'),
      address: z.string().describe('Delivery or collection address'),
      type: z
        .enum(['Delivery', 'Collection'])
        .optional()
        .describe('Job type — Delivery or Collection'),
      assignTo: z.string().optional().describe('Driver or vehicle name to assign the job to'),
      deliverTo: z
        .string()
        .optional()
        .describe('Recipient name (for deliveries) or sender name (for collections)'),
      lastName: z.string().optional().describe('Recipient/sender last name'),
      companyName: z.string().optional().describe('Company name'),
      phone: z.string().optional().describe('Recipient phone number'),
      senderPhone: z.string().optional().describe('Sender phone number'),
      notifyEmail: z
        .string()
        .optional()
        .describe('Email address(es) for notifications, semicolon-separated'),
      trackingNumber: z.string().optional().describe('Tracking number for customer tracking'),
      orderNumber: z.string().optional().describe('Purchase order number'),
      instructions: z.string().optional().describe('Instructions for the driver'),
      jobType: z
        .string()
        .optional()
        .describe('Job classification (e.g., Urgent, Express, Same day)'),
      jobSequence: z
        .number()
        .optional()
        .describe('Display order in driver app — lowest appears first'),
      jobTime: z.string().optional().describe('Scheduled time for the job'),
      timeWindow: z.string().optional().describe('Service window for job completion'),
      startDate: z.string().optional().describe('Job start date in YYYY-MM-DD format'),
      zone: z.string().optional().describe('Geographic zone for the job'),
      postalCode: z.string().optional().describe('Postal/ZIP code'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      country: z.string().optional().describe('Country'),
      addressLat: z.number().optional().describe('Address latitude'),
      addressLng: z.number().optional().describe('Address longitude'),
      weight: z.number().optional().describe('Package weight'),
      parcelWidth: z.number().optional().describe('Parcel width in cm'),
      parcelLength: z.number().optional().describe('Parcel length in cm'),
      parcelHeight: z.number().optional().describe('Parcel height in cm'),
      pieces: z.number().optional().describe('Number of pieces'),
      boxes: z.string().optional().describe('Box count or description'),
      pallets: z.number().optional().describe('Number of pallets'),
      customer: z.string().optional().describe('Customer/requestor name'),
      accountNumber: z.string().optional().describe('Customer account number'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      invoiceAmount: z.number().optional().describe('Invoice amount'),
      paymentMode: z.string().optional().describe('Payment method (e.g., COD, Credit Card)'),
      paymentAmount: z.number().optional().describe('Cash-on-delivery collection amount'),
      remarks: z.string().optional().describe('Internal remarks'),
      serviceType: z.string().optional().describe('Service classification'),
      serviceTime: z.number().optional().describe('Minutes required for job completion'),
      openToMarketplace: z
        .boolean()
        .optional()
        .describe('Whether to open the job to the driver marketplace'),
      autoReschedule: z.boolean().optional().describe('Forward to next day if incomplete'),
      webhookUrl: z
        .string()
        .optional()
        .describe('Webhook URL for push notifications for this job'),
      items: z.array(itemSchema).optional().describe('List of items for this job')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Detrack-assigned job ID'),
      doNumber: z.string().describe('Delivery order number'),
      date: z.string().describe('Job date'),
      status: z.string().optional().describe('Job status'),
      trackingNumber: z.string().optional().describe('Tracking number'),
      assignTo: z.string().optional().describe('Assigned driver/vehicle'),
      address: z.string().optional().describe('Job address'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full job response from Detrack')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DetrackClient(ctx.auth.token);

    let jobData: JobData = {
      date: ctx.input.date,
      do_number: ctx.input.doNumber,
      address: ctx.input.address
    };

    if (ctx.input.type !== undefined) jobData.type = ctx.input.type;
    if (ctx.input.assignTo !== undefined) jobData.assign_to = ctx.input.assignTo;
    if (ctx.input.deliverTo !== undefined)
      jobData.deliver_to_collect_from = ctx.input.deliverTo;
    if (ctx.input.lastName !== undefined) jobData.last_name = ctx.input.lastName;
    if (ctx.input.companyName !== undefined) jobData.company_name = ctx.input.companyName;
    if (ctx.input.phone !== undefined) jobData.phone_number = ctx.input.phone;
    if (ctx.input.senderPhone !== undefined)
      jobData.sender_phone_number = ctx.input.senderPhone;
    if (ctx.input.notifyEmail !== undefined) jobData.notify_email = ctx.input.notifyEmail;
    if (ctx.input.trackingNumber !== undefined)
      jobData.tracking_number = ctx.input.trackingNumber;
    if (ctx.input.orderNumber !== undefined) jobData.order_number = ctx.input.orderNumber;
    if (ctx.input.instructions !== undefined) jobData.instructions = ctx.input.instructions;
    if (ctx.input.jobType !== undefined) jobData.job_type = ctx.input.jobType;
    if (ctx.input.jobSequence !== undefined) jobData.job_sequence = ctx.input.jobSequence;
    if (ctx.input.jobTime !== undefined) jobData.job_time = ctx.input.jobTime;
    if (ctx.input.timeWindow !== undefined) jobData.time_window = ctx.input.timeWindow;
    if (ctx.input.startDate !== undefined) jobData.start_date = ctx.input.startDate;
    if (ctx.input.zone !== undefined) jobData.zone = ctx.input.zone;
    if (ctx.input.postalCode !== undefined) jobData.postal_code = ctx.input.postalCode;
    if (ctx.input.city !== undefined) jobData.city = ctx.input.city;
    if (ctx.input.state !== undefined) jobData.state = ctx.input.state;
    if (ctx.input.country !== undefined) jobData.country = ctx.input.country;
    if (ctx.input.addressLat !== undefined) jobData.address_lat = ctx.input.addressLat;
    if (ctx.input.addressLng !== undefined) jobData.address_lng = ctx.input.addressLng;
    if (ctx.input.weight !== undefined) jobData.weight = ctx.input.weight;
    if (ctx.input.parcelWidth !== undefined) jobData.parcel_width = ctx.input.parcelWidth;
    if (ctx.input.parcelLength !== undefined) jobData.parcel_length = ctx.input.parcelLength;
    if (ctx.input.parcelHeight !== undefined) jobData.parcel_height = ctx.input.parcelHeight;
    if (ctx.input.pieces !== undefined) jobData.pieces = ctx.input.pieces;
    if (ctx.input.boxes !== undefined) jobData.boxes = ctx.input.boxes;
    if (ctx.input.pallets !== undefined) jobData.pallets = ctx.input.pallets;
    if (ctx.input.customer !== undefined) jobData.customer = ctx.input.customer;
    if (ctx.input.accountNumber !== undefined)
      jobData.account_number = ctx.input.accountNumber;
    if (ctx.input.invoiceNumber !== undefined)
      jobData.invoice_number = ctx.input.invoiceNumber;
    if (ctx.input.invoiceAmount !== undefined)
      jobData.invoice_amount = ctx.input.invoiceAmount;
    if (ctx.input.paymentMode !== undefined) jobData.payment_mode = ctx.input.paymentMode;
    if (ctx.input.paymentAmount !== undefined)
      jobData.payment_amount = ctx.input.paymentAmount;
    if (ctx.input.remarks !== undefined) jobData.remarks = ctx.input.remarks;
    if (ctx.input.serviceType !== undefined) jobData.service_type = ctx.input.serviceType;
    if (ctx.input.serviceTime !== undefined) jobData.service_time = ctx.input.serviceTime;
    if (ctx.input.openToMarketplace !== undefined)
      jobData.open_to_marketplace = ctx.input.openToMarketplace;
    if (ctx.input.autoReschedule !== undefined)
      jobData.auto_reschedule = ctx.input.autoReschedule;
    if (ctx.input.webhookUrl !== undefined) jobData.webhook_url = ctx.input.webhookUrl;

    if (ctx.input.items !== undefined) {
      jobData.items = ctx.input.items.map(item => ({
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        unit_of_measure: item.unitOfMeasure,
        comments: item.comments,
        unit_price: item.unitPrice,
        weight: item.weight,
        serial_numbers: item.serialNumber !== undefined ? [item.serialNumber] : undefined,
        batch_number: item.batchNumber,
        expiry_date: item.expiryDate,
        purchase_order_number: item.poNumber
      }));
    }

    let result = await client.createJob(jobData);

    return {
      output: {
        jobId: result.id !== undefined && result.id !== null ? String(result.id) : undefined,
        doNumber: result.do_number,
        date: result.date,
        status: result.status ? String(result.status) : undefined,
        trackingNumber: result.tracking_number ? String(result.tracking_number) : undefined,
        assignTo: result.assign_to ? String(result.assign_to) : undefined,
        address: result.address ? String(result.address) : undefined,
        raw: result
      },
      message: `Created job **${ctx.input.doNumber}** for ${ctx.input.date} at ${ctx.input.address}.${ctx.input.assignTo ? ` Assigned to **${ctx.input.assignTo}**.` : ''}`
    };
  })
  .build();
