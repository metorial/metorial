import { z } from 'zod';

// --- Shared sub-schemas ---

export let emailSchema = z.object({
  type: z.string().describe('Label for the email, e.g. "work", "home", "other"'),
  value: z.string().describe('The email address')
});

export let phoneSchema = z.object({
  type: z
    .string()
    .describe('Label for the phone, e.g. "work", "mobile", "home", "direct", "fax", "other"'),
  value: z.string().describe('The phone number')
});

export let urlSchema = z.object({
  type: z
    .string()
    .describe(
      'Label for the URL, e.g. "website", "blog", "twitter", "linkedin", "facebook", "other"'
    ),
  value: z.string().describe('The URL')
});

export let addressSchema = z.object({
  address: z.string().optional().describe('Street address'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State or region'),
  zipCode: z.string().optional().describe('ZIP or postal code'),
  countryCode: z.string().optional().describe('ISO-3166 country code')
});

export let customFieldValueSchema = z.object({
  customFieldId: z.string().describe('The ID of the custom field'),
  value: z.any().describe('The value of the custom field')
});

// --- Contact ---

export let contactSchema = z.object({
  contactId: z.string().describe('Unique identifier for the contact'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  companyName: z.string().optional().describe('Company/organization name'),
  companyId: z.string().optional().describe('ID of the associated company'),
  jobTitle: z.string().optional().describe('Job title'),
  background: z.string().optional().describe('Background information'),
  status: z.string().optional().describe('Contact status'),
  statusId: z.string().optional().describe('Contact status ID'),
  leadSourceId: z.string().optional().describe('Lead source ID'),
  ownerId: z.string().optional().describe('ID of the user who owns this contact'),
  emails: z.array(emailSchema).optional().describe('Email addresses'),
  phones: z.array(phoneSchema).optional().describe('Phone numbers'),
  urls: z.array(urlSchema).optional().describe('URLs'),
  address: addressSchema.optional().describe('Postal address'),
  tags: z.array(z.string()).optional().describe('Tags associated with the contact'),
  starValue: z.number().optional().describe('Star rating (0-5)'),
  customFields: z.array(customFieldValueSchema).optional().describe('Custom field values'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

// --- Company ---

export let companySchema = z.object({
  companyId: z.string().describe('Unique identifier for the company'),
  name: z.string().describe('Company name'),
  description: z.string().optional().describe('Company description'),
  phone: z.string().optional().describe('Company phone number'),
  url: z.string().optional().describe('Company website URL'),
  address: addressSchema.optional().describe('Company postal address'),
  customFields: z.array(customFieldValueSchema).optional().describe('Custom field values'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

// --- Deal ---

export let dealSchema = z.object({
  dealId: z.string().describe('Unique identifier for the deal'),
  contactId: z.string().optional().describe('ID of the associated contact'),
  companyId: z.string().optional().describe('ID of the associated company'),
  ownerId: z.string().optional().describe('ID of the user who owns this deal'),
  name: z.string().describe('Deal name'),
  amount: z.number().optional().describe('Deal monetary amount'),
  months: z.number().optional().describe('Number of months for the deal'),
  status: z.string().optional().describe('Deal status: pending, won, or lost'),
  stage: z.number().optional().describe('Deal pipeline stage (numeric)'),
  expectedCloseDate: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
  closeDate: z.string().optional().describe('Actual close date (YYYY-MM-DD)'),
  text: z.string().optional().describe('Deal description or notes'),
  customFields: z.array(customFieldValueSchema).optional().describe('Custom field values'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

// --- Action ---

export let actionSchema = z.object({
  actionId: z.string().describe('Unique identifier for the action'),
  contactId: z.string().describe('ID of the associated contact'),
  assigneeId: z.string().optional().describe('ID of the user assigned to this action'),
  text: z.string().describe('Action description text'),
  date: z.string().optional().describe('Due date (YYYY-MM-DD)'),
  exactTime: z.number().optional().describe('Exact time as Unix timestamp'),
  status: z.string().optional().describe('Action status: asap, date, waiting, queued, done'),
  done: z.boolean().optional().describe('Whether the action has been completed'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

// --- Note ---

export let noteSchema = z.object({
  noteId: z.string().describe('Unique identifier for the note'),
  contactId: z.string().describe('ID of the associated contact'),
  authorId: z.string().optional().describe('ID of the user who authored the note'),
  text: z.string().describe('Note content text'),
  linkedDealId: z.string().optional().describe('ID of a linked deal'),
  date: z.string().optional().describe('Note date'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

// --- Call ---

export let callSchema = z.object({
  callId: z.string().describe('Unique identifier for the call'),
  contactId: z.string().describe('ID of the associated contact'),
  authorId: z.string().optional().describe('ID of the user who logged the call'),
  phoneNumber: z.string().optional().describe('Phone number for the call'),
  text: z.string().optional().describe('Call notes or description'),
  callResult: z.string().optional().describe('Result of the call'),
  callTime: z.string().optional().describe('Time of the call'),
  via: z.string().optional().describe('How the call was made'),
  recordingLink: z.string().optional().describe('Link to call recording'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

// --- Meeting ---

export let meetingSchema = z.object({
  meetingId: z.string().describe('Unique identifier for the meeting'),
  contactId: z.string().describe('ID of the associated contact'),
  authorId: z.string().optional().describe('ID of the user who logged the meeting'),
  text: z.string().optional().describe('Meeting notes or description'),
  meetingTime: z.string().optional().describe('Time of the meeting'),
  place: z.string().optional().describe('Meeting location'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp')
});

// --- Predefined Item ---

export let predefinedItemSchema = z.object({
  predefinedItemId: z.string().describe('Unique identifier for the predefined item'),
  name: z.string().describe('Name of the product/service'),
  description: z.string().optional().describe('Item description'),
  cost: z.number().optional().describe('Item cost'),
  price: z.number().optional().describe('Item price'),
  amount: z.number().optional().describe('Default amount')
});

// --- Status ---

export let statusSchema = z.object({
  statusId: z.string().describe('Unique identifier for the status'),
  text: z.string().describe('Status label text'),
  description: z.string().optional().describe('Status description'),
  color: z.string().optional().describe('Status color'),
  count: z.number().optional().describe('Number of contacts with this status')
});

// --- Lead Source ---

export let leadSourceSchema = z.object({
  leadSourceId: z.string().describe('Unique identifier for the lead source'),
  text: z.string().describe('Lead source label text'),
  count: z.number().optional().describe('Number of contacts with this lead source')
});
