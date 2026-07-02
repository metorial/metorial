import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient } from '../lib/client';
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

export let updateJobTool = SlateTool.create(spec, {
  name: 'Update Job',
  key: 'update_job',
  description: `Updates an existing delivery or collection job in Detrack. Provide the doNumber and date to identify the job, then supply any fields you want to change. Only provided fields will be updated.`,
  instructions: [
    'The doNumber and date are required to identify the job to update.',
    'Only include the fields you want to change — omitted fields remain unchanged.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      doNumber: z.string().describe('Delivery order number of the job to update'),
      date: z.string().describe('Job date in YYYY-MM-DD format'),
      address: z.string().optional().describe('Updated delivery or collection address'),
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
      jobSequence: z.number().optional().describe('Display order in driver app'),
      jobTime: z.string().optional().describe('Scheduled time for the job'),
      timeWindow: z.string().optional().describe('Service window for job completion'),
      zone: z.string().optional().describe('Geographic zone for the job'),
      weight: z.number().optional().describe('Package weight'),
      customer: z.string().optional().describe('Customer/requestor name'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      invoiceAmount: z.number().optional().describe('Invoice amount'),
      paymentMode: z.string().optional().describe('Payment method (e.g., COD, Credit Card)'),
      paymentAmount: z.number().optional().describe('Cash-on-delivery collection amount'),
      remarks: z.string().optional().describe('Internal remarks'),
      openToMarketplace: z
        .boolean()
        .optional()
        .describe('Whether to open the job to the driver marketplace'),
      autoReschedule: z.boolean().optional().describe('Forward to next day if incomplete'),
      items: z
        .array(itemSchema)
        .optional()
        .describe('Updated list of items for this job — replaces existing items')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Detrack-assigned job ID'),
      doNumber: z.string().describe('Delivery order number'),
      date: z.string().describe('Job date'),
      status: z.string().optional().describe('Job status'),
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

    let jobData: Record<string, unknown> = {
      do_number: ctx.input.doNumber,
      date: ctx.input.date
    };

    if (ctx.input.address) jobData.address = ctx.input.address;
    if (ctx.input.type) jobData.type = ctx.input.type;
    if (ctx.input.assignTo !== undefined) jobData.assign_to = ctx.input.assignTo;
    if (ctx.input.deliverTo) jobData.deliver_to_collect_from = ctx.input.deliverTo;
    if (ctx.input.lastName) jobData.last_name = ctx.input.lastName;
    if (ctx.input.companyName) jobData.company_name = ctx.input.companyName;
    if (ctx.input.phone) jobData.phone = ctx.input.phone;
    if (ctx.input.senderPhone) jobData.sender_phone = ctx.input.senderPhone;
    if (ctx.input.notifyEmail) jobData.notify_email = ctx.input.notifyEmail;
    if (ctx.input.trackingNumber) jobData.tracking_number = ctx.input.trackingNumber;
    if (ctx.input.orderNumber) jobData.order_number = ctx.input.orderNumber;
    if (ctx.input.instructions) jobData.instructions = ctx.input.instructions;
    if (ctx.input.jobType) jobData.job_type = ctx.input.jobType;
    if (ctx.input.jobSequence !== undefined) jobData.job_sequence = ctx.input.jobSequence;
    if (ctx.input.jobTime) jobData.job_time = ctx.input.jobTime;
    if (ctx.input.timeWindow) jobData.time_window = ctx.input.timeWindow;
    if (ctx.input.zone) jobData.zone = ctx.input.zone;
    if (ctx.input.weight !== undefined) jobData.weight = ctx.input.weight;
    if (ctx.input.customer) jobData.customer = ctx.input.customer;
    if (ctx.input.invoiceNumber) jobData.invoice_number = ctx.input.invoiceNumber;
    if (ctx.input.invoiceAmount !== undefined)
      jobData.invoice_amount = ctx.input.invoiceAmount;
    if (ctx.input.paymentMode) jobData.payment_mode = ctx.input.paymentMode;
    if (ctx.input.paymentAmount !== undefined)
      jobData.payment_amount = ctx.input.paymentAmount;
    if (ctx.input.remarks) jobData.remarks = ctx.input.remarks;
    if (ctx.input.openToMarketplace !== undefined)
      jobData.open_to_marketplace = ctx.input.openToMarketplace;
    if (ctx.input.autoReschedule !== undefined)
      jobData.auto_reschedule = ctx.input.autoReschedule;

    if (ctx.input.items && ctx.input.items.length > 0) {
      jobData.items = ctx.input.items.map(item => ({
        sku: item.sku,
        desc: item.description,
        qty: item.quantity,
        unit_of_measure: item.unitOfMeasure,
        comments: item.comments,
        unit_price: item.unitPrice,
        weight: item.weight,
        serial_no: item.serialNumber,
        batch_no: item.batchNumber,
        expiry_date: item.expiryDate,
        po_number: item.poNumber
      }));
    }

    let result = await client.updateJob(jobData as any);

    return {
      output: {
        jobId: result.id ? String(result.id) : undefined,
        doNumber: String(result.do_number ?? ctx.input.doNumber),
        date: String(result.date ?? ctx.input.date),
        status: result.status ? String(result.status) : undefined,
        assignTo: result.assign_to ? String(result.assign_to) : undefined,
        address: result.address ? String(result.address) : undefined,
        raw: result
      },
      message: `Updated job **${ctx.input.doNumber}** for ${ctx.input.date}.`
    };
  })
  .build();
