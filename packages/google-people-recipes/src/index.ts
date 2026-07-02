import { badRequestError, ServiceError } from '@lowerdeck/error';
import { defineToolRecipe } from '@slates/tool-recipes';
import { anyOf, createAxios } from 'slates';
import { z } from 'zod';

export let GOOGLE_PEOPLE_API_BASE_URL = 'https://people.googleapis.com/v1/';

export type GooglePeopleApi = {
  get: (url: string, config?: any) => Promise<{ data: any }>;
};

let peopleAxios = createAxios({
  baseURL: GOOGLE_PEOPLE_API_BASE_URL
}) as GooglePeopleApi;

export let googlePeopleScopes = {
  contactsReadonly: 'https://www.googleapis.com/auth/contacts.readonly'
} as const;

export let googlePeopleReadonlyScopes = anyOf(googlePeopleScopes.contactsReadonly);

export let DEFAULT_PERSON_FIELDS =
  'names,emailAddresses,phoneNumbers,addresses,organizations,birthdays,urls,biographies,events,genders,occupations,nicknames,relations,userDefined,memberships';

export let READONLY_PERSON_FIELDS = 'names,emailAddresses,phoneNumbers';

export interface ContactInput {
  names?: Array<{
    givenName?: string;
    familyName?: string;
    middleName?: string;
    prefix?: string;
    suffix?: string;
  }>;
  emailAddresses?: Array<{ value: string; type?: string }>;
  phoneNumbers?: Array<{ value: string; type?: string }>;
  addresses?: Array<{
    streetAddress?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    type?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
    department?: string;
  }>;
  birthdays?: Array<{ date?: { year?: number; month?: number; day?: number } }>;
  urls?: Array<{ value: string; type?: string }>;
  biographies?: Array<{ value: string }>;
  userDefined?: Array<{ key: string; value: string }>;
  nicknames?: Array<{ value: string }>;
  relations?: Array<{ person: string; type?: string }>;
  events?: Array<{ date?: { year?: number; month?: number; day?: number }; type?: string }>;
  occupations?: Array<{ value: string }>;
}

export let nameSchema = z
  .object({
    displayName: z.string().optional().describe('Full display name'),
    givenName: z.string().optional().describe('First/given name'),
    familyName: z.string().optional().describe('Last/family name'),
    middleName: z.string().optional().describe('Middle name'),
    prefix: z.string().optional().describe('Name prefix (e.g., Mr., Dr.)'),
    suffix: z.string().optional().describe('Name suffix (e.g., Jr., III)')
  })
  .describe('Name of the contact');

export let emailSchema = z
  .object({
    value: z.string().describe('Email address'),
    type: z.string().optional().describe('Type of email (e.g., home, work, other)')
  })
  .describe('Email address');

export let phoneSchema = z
  .object({
    value: z.string().describe('Phone number'),
    type: z.string().optional().describe('Type of phone (e.g., home, work, mobile)')
  })
  .describe('Phone number');

export let addressSchema = z
  .object({
    streetAddress: z.string().optional().describe('Street address'),
    city: z.string().optional().describe('City'),
    region: z.string().optional().describe('State or region'),
    postalCode: z.string().optional().describe('Postal/ZIP code'),
    country: z.string().optional().describe('Country'),
    type: z.string().optional().describe('Type of address (e.g., home, work)')
  })
  .describe('Physical address');

export let organizationSchema = z
  .object({
    name: z.string().optional().describe('Organization name'),
    title: z.string().optional().describe('Job title'),
    department: z.string().optional().describe('Department name')
  })
  .describe('Organization/company');

export let dateFieldSchema = z
  .object({
    year: z.number().optional().describe('Year (omit for recurring events)'),
    month: z.number().optional().describe('Month (1-12)'),
    day: z.number().optional().describe('Day of month (1-31)')
  })
  .describe('Date');

export let birthdaySchema = z
  .object({
    date: dateFieldSchema.optional()
  })
  .describe('Birthday');

export let urlSchema = z
  .object({
    value: z.string().describe('URL'),
    type: z.string().optional().describe('Type of URL (e.g., homePage, blog, profile)')
  })
  .describe('URL');

export let biographySchema = z
  .object({
    value: z.string().describe('Biography or notes text')
  })
  .describe('Biography/notes');

export let customFieldSchema = z
  .object({
    key: z.string().describe('Custom field label'),
    value: z.string().describe('Custom field value')
  })
  .describe('Custom field');

export let nicknameSchema = z
  .object({
    value: z.string().describe('Nickname')
  })
  .describe('Nickname');

export let relationSchema = z
  .object({
    person: z.string().describe('Name of the related person'),
    type: z
      .string()
      .optional()
      .describe('Relationship type (e.g., spouse, parent, child, friend)')
  })
  .describe('Relationship');

export let eventSchema = z
  .object({
    date: dateFieldSchema.optional(),
    type: z.string().optional().describe('Type of event (e.g., anniversary)')
  })
  .describe('Event/date');

export let occupationSchema = z
  .object({
    value: z.string().describe('Occupation')
  })
  .describe('Occupation');

export let membershipSchema = z
  .object({
    contactGroupResourceName: z
      .string()
      .optional()
      .describe('Resource name of the contact group')
  })
  .describe('Group membership');

export let contactInputSchema = z.object({
  names: z.array(nameSchema).optional().describe('Names for the contact'),
  emailAddresses: z.array(emailSchema).optional().describe('Email addresses'),
  phoneNumbers: z.array(phoneSchema).optional().describe('Phone numbers'),
  addresses: z.array(addressSchema).optional().describe('Physical addresses'),
  organizations: z.array(organizationSchema).optional().describe('Organizations/companies'),
  birthdays: z.array(birthdaySchema).optional().describe('Birthdays'),
  urls: z.array(urlSchema).optional().describe('URLs'),
  biographies: z.array(biographySchema).optional().describe('Biographies/notes'),
  userDefined: z.array(customFieldSchema).optional().describe('Custom fields'),
  nicknames: z.array(nicknameSchema).optional().describe('Nicknames'),
  relations: z.array(relationSchema).optional().describe('Relationships'),
  events: z.array(eventSchema).optional().describe('Events/dates'),
  occupations: z.array(occupationSchema).optional().describe('Occupations')
});

export let contactOutputSchema = z.object({
  resourceName: z.string().describe('Unique resource name (e.g., people/c12345)'),
  etag: z.string().optional().describe('ETag for concurrency control, required when updating'),
  names: z.array(nameSchema).optional(),
  emailAddresses: z.array(emailSchema).optional(),
  phoneNumbers: z.array(phoneSchema).optional(),
  addresses: z.array(addressSchema).optional(),
  organizations: z.array(organizationSchema).optional(),
  birthdays: z.array(birthdaySchema).optional(),
  urls: z.array(urlSchema).optional(),
  biographies: z.array(biographySchema).optional(),
  userDefined: z.array(customFieldSchema).optional(),
  nicknames: z.array(nicknameSchema).optional(),
  relations: z.array(relationSchema).optional(),
  events: z.array(eventSchema).optional(),
  occupations: z.array(occupationSchema).optional(),
  memberships: z.array(membershipSchema).optional()
});

export let listContactsInputSchema = z.object({
  pageSize: z
    .number()
    .optional()
    .describe('Number of contacts to return per page (max 1000, default 100)'),
  pageToken: z.string().optional().describe('Token for fetching the next page of results'),
  sortOrder: z
    .enum([
      'LAST_MODIFIED_ASCENDING',
      'LAST_MODIFIED_DESCENDING',
      'FIRST_NAME_ASCENDING',
      'LAST_NAME_ASCENDING'
    ])
    .optional()
    .describe('Sort order for the results')
});

export let listContactsOutputSchema = z.object({
  contacts: z.array(contactOutputSchema).describe('List of contacts'),
  nextPageToken: z.string().optional().describe('Token for fetching the next page'),
  totalPeople: z.number().optional().describe('Total number of contacts'),
  totalItems: z.number().optional().describe('Total number of items in response')
});

export let searchContactsInputSchema = z.object({
  query: z
    .string()
    .describe(
      'Search query — matches against names, emails, phone numbers, and other contact fields'
    ),
  pageSize: z.number().optional().describe('Maximum number of results to return (default 30)')
});

export let searchContactsOutputSchema = z.object({
  contacts: z.array(contactOutputSchema).describe('Matching contacts')
});

export let getContactInputSchema = z.object({
  resourceName: z
    .string()
    .describe('Resource name of the contact (e.g., "people/c12345" or "people/me")')
});

export let formatContact = (person: any) => {
  return {
    resourceName: person.resourceName,
    etag: person.etag,
    names: person.names,
    emailAddresses: person.emailAddresses,
    phoneNumbers: person.phoneNumbers,
    addresses: person.addresses,
    organizations: person.organizations,
    birthdays: person.birthdays,
    urls: person.urls,
    biographies: person.biographies,
    userDefined: person.userDefined,
    nicknames: person.nicknames,
    relations: person.relations,
    events: person.events,
    occupations: person.occupations,
    memberships: person.memberships?.map((membership: any) => ({
      contactGroupResourceName: membership.contactGroupMembership?.contactGroupResourceName
    }))
  };
};

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addMessage = (messages: string[], value: unknown) => {
  if (typeof value !== 'string') return;
  let trimmed = value.trim();
  if (trimmed && !messages.includes(trimmed)) {
    messages.push(trimmed);
  }
};

let collectMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    addMessage(messages, value);
    return;
  }

  for (let key of ['message', 'error_description', 'error', 'detail', 'reason']) {
    addMessage(messages, value[key]);
  }

  let nestedError = value.error;
  if (isRecord(nestedError)) {
    collectMessages(nestedError, messages);
  }

  let errors = value.errors;
  if (Array.isArray(errors)) {
    for (let item of errors) {
      collectMessages(item, messages);
    }
  }
};

let extractGooglePeopleMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectMessages(response?.data, messages);

  if (isRecord(error)) {
    collectMessages(error.data, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getErrorStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;
  let response = error.response as ErrorResponse | undefined;
  if (typeof response?.status === 'number') return response.status;
  if (typeof error.status === 'number') return error.status;
  if (isRecord(error.data) && typeof error.data.status === 'number') return error.data.status;
  if (isRecord(error.upstream) && typeof error.upstream.status === 'number') {
    return error.upstream.status;
  }
  return undefined;
};

let getErrorStatusText = (error: unknown) => {
  if (!isRecord(error)) return undefined;
  let response = error.response as ErrorResponse | undefined;
  if (typeof response?.statusText === 'string') return response.statusText;
  if (isRecord(error.upstream) && typeof error.upstream.statusText === 'string') {
    return error.upstream.statusText;
  }
  return undefined;
};

export let googlePeopleServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let googlePeopleApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let status = getErrorStatus(error);
  let statusText = getErrorStatusText(error);
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';
  let serviceError = googlePeopleServiceError(
    `Google People API ${operation} failed: ${statusLabel}${extractGooglePeopleMessage(error)}`
  );

  serviceError.data.reason = 'google_people_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export class GooglePeopleClient {
  private api: GooglePeopleApi;

  constructor(private config: { token: string; api?: GooglePeopleApi }) {
    this.api = config.api ?? peopleAxios;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.config.token}`
    };
  }

  async getContact(resourceName: string, personFields?: string) {
    try {
      let response = await this.api.get(resourceName, {
        params: { personFields: personFields || DEFAULT_PERSON_FIELDS },
        headers: this.headers()
      });
      return response.data;
    } catch (error) {
      throw googlePeopleApiError(error, 'get contact');
    }
  }

  async listContacts(params: {
    pageSize?: number;
    pageToken?: string;
    sortOrder?: string;
    personFields?: string;
    syncToken?: string;
    requestSyncToken?: boolean;
  }) {
    try {
      let response = await this.api.get('people/me/connections', {
        params: {
          personFields: params.personFields || DEFAULT_PERSON_FIELDS,
          pageSize: params.pageSize || 100,
          pageToken: params.pageToken,
          sortOrder: params.sortOrder,
          syncToken: params.syncToken,
          requestSyncToken: params.requestSyncToken
        },
        headers: this.headers()
      });
      return response.data;
    } catch (error) {
      throw googlePeopleApiError(error, 'list contacts');
    }
  }

  async searchContacts(query: string, personFields?: string, pageSize?: number) {
    try {
      let response = await this.api.get('people:searchContacts', {
        params: {
          query,
          readMask: personFields || DEFAULT_PERSON_FIELDS,
          pageSize: pageSize || 30
        },
        headers: this.headers()
      });
      return response.data;
    } catch (error) {
      throw googlePeopleApiError(error, 'search contacts');
    }
  }
}

export type GooglePeopleRecipeDependencies = {
  createClient: (ctx: { auth: { token: string } }) => GooglePeopleClient;
};

export let createGooglePeopleClient = (ctx: { auth: { token: string } }) =>
  new GooglePeopleClient({ token: ctx.auth.token });

export let listContactsRecipe = defineToolRecipe({
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Lists the authenticated user's contacts with pagination support. Returns contacts sorted by the specified order. Use the \`pageToken\` from a previous response to fetch the next page.`,
  tags: {
    destructive: false,
    readOnly: true
  },
  defaultScopes: googlePeopleReadonlyScopes,
  inputSchema: listContactsInputSchema,
  outputSchema: listContactsOutputSchema,
  handleInvocation: async ({
    ctx,
    dependencies
  }: {
    ctx: any;
    dependencies: GooglePeopleRecipeDependencies;
  }) => {
    let client = dependencies.createClient(ctx);
    let result = await client.listContacts({
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken,
      sortOrder: ctx.input.sortOrder
    });
    let contacts = (result.connections || []).map(formatContact);

    return {
      output: {
        contacts,
        nextPageToken: result.nextPageToken,
        totalPeople: result.totalPeople,
        totalItems: result.totalItems
      },
      message: `Listed **${contacts.length}** contacts${result.totalPeople ? ` out of ${result.totalPeople} total` : ''}.${result.nextPageToken ? ' More pages available.' : ''}`
    };
  }
});

export let searchContactsRecipe = defineToolRecipe({
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Searches the authenticated user's contacts by name, email address, phone number, or other fields. Returns matching contacts ranked by relevance.`,
  tags: {
    destructive: false,
    readOnly: true
  },
  defaultScopes: googlePeopleReadonlyScopes,
  inputSchema: searchContactsInputSchema,
  outputSchema: searchContactsOutputSchema,
  handleInvocation: async ({
    ctx,
    dependencies
  }: {
    ctx: any;
    dependencies: GooglePeopleRecipeDependencies;
  }) => {
    let client = dependencies.createClient(ctx);
    let result = await client.searchContacts(ctx.input.query, undefined, ctx.input.pageSize);
    let contacts = (result.results || []).map((item: any) => formatContact(item.person));

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contacts matching "${ctx.input.query}".`
    };
  }
});

export let getContactRecipe = defineToolRecipe({
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieves detailed information about a specific contact by their resource name. Use \`people/me\` to get the authenticated user's profile. Returns all available contact fields.`,
  tags: {
    destructive: false,
    readOnly: true
  },
  defaultScopes: googlePeopleReadonlyScopes,
  inputSchema: getContactInputSchema,
  outputSchema: contactOutputSchema,
  handleInvocation: async ({
    ctx,
    dependencies
  }: {
    ctx: any;
    dependencies: GooglePeopleRecipeDependencies;
  }) => {
    let client = dependencies.createClient(ctx);
    let result = await client.getContact(ctx.input.resourceName);
    let contact = formatContact(result);
    let displayName =
      contact.names?.[0]?.displayName ||
      contact.emailAddresses?.[0]?.value ||
      ctx.input.resourceName;

    return {
      output: contact,
      message: `Retrieved contact **${displayName}**.`
    };
  }
});
