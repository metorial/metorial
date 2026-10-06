import { z } from 'zod';
import { FreshBooksClient, idOf, type Kind, resources } from './client';
import {
  canonicalDecimal,
  currency,
  date,
  decimal,
  type FreshBooksAuth,
  integer,
  invalid,
  parseOutput,
  type Row,
  resourceId,
  row,
  startedAt,
  text,
  unexpected
} from './contracts';

type Context = { auth: FreshBooksAuth; input: Row; config: Row };
const fields: Record<Kind, Record<string, string>> = {
  clients: {
    firstName: 'fname',
    lastName: 'lname',
    organization: 'organization',
    email: 'email',
    phone: 'bus_phone',
    mobilePhone: 'mob_phone',
    currencyCode: 'currency_code',
    language: 'language',
    billingStreet: 'p_street',
    billingCity: 'p_city',
    billingProvince: 'p_province',
    billingPostalCode: 'p_code',
    billingCountry: 'p_country',
    outstandingBalance: 'outstanding_balance'
  },
  invoices: {
    invoiceNumber: 'invoice_number',
    customerId: 'customerid',
    status: 'status',
    amount: 'amount',
    outstandingAmount: 'outstanding',
    currencyCode: 'currency_code',
    createDate: 'create_date',
    dueDate: 'due_date',
    dueOffsetDays: 'due_offset_days',
    discountValue: 'discount_value',
    terms: 'terms',
    notes: 'notes',
    poNumber: 'po_number'
  },
  estimates: {
    estimateNumber: 'estimate_number',
    customerId: 'customerid',
    status: 'status',
    amount: 'amount',
    currencyCode: 'currency_code',
    createDate: 'create_date',
    discountValue: 'discount_value',
    terms: 'terms',
    notes: 'notes',
    poNumber: 'po_number'
  },
  payments: {
    invoiceId: 'invoiceid',
    clientId: 'clientid',
    amount: 'amount',
    date: 'date',
    paymentType: 'type',
    note: 'note'
  },
  expenses: {
    amount: 'amount',
    currencyCode: 'currency_code',
    date: 'date',
    categoryId: 'categoryid',
    vendorName: 'vendor',
    clientId: 'clientid',
    projectId: 'projectid',
    notes: 'notes',
    status: 'status',
    taxName1: 'taxName1',
    taxName2: 'taxName2',
    taxPercent1: 'taxPercent1',
    taxPercent2: 'taxPercent2'
  },
  time_entries: {
    duration: 'duration',
    startedAt: 'started_at',
    clientId: 'client_id',
    projectId: 'project_id',
    note: 'note',
    billable: 'billable',
    billed: 'billed',
    isLogged: 'is_logged'
  },
  projects: {
    title: 'title',
    clientId: 'client_id',
    projectType: 'project_type',
    fixedPrice: 'fixed_price',
    rate: 'rate',
    description: 'description',
    dueDate: 'due_date',
    complete: 'complete',
    active: 'active',
    loggedDuration: 'logged_duration'
  },
  taxes: {
    name: 'name',
    amount: 'amount',
    compound: 'compound',
    number: 'number',
    updatedAt: 'updated'
  },
  items: {
    name: 'name',
    description: 'description',
    unitCost: 'unit_cost',
    inventory: 'inventory',
    sku: 'sku',
    tax1: 'tax1',
    tax2: 'tax2',
    updatedAt: 'updated'
  },
  credit_notes: {
    creditNumber: 'credit_number',
    customerId: 'clientid',
    createDate: 'create_date',
    currencyCode: 'currency_code',
    amount: 'amount',
    notes: 'notes',
    status: 'status'
  },
  expense_categories: { name: 'category', isCogs: 'is_cogs', parentId: 'parentid' }
};
const numericFields = new Set([
  'customerId',
  'clientId',
  'invoiceId',
  'projectId',
  'categoryId',
  'status',
  'duration',
  'dueOffsetDays',
  'loggedDuration',
  'tax1',
  'tax2'
]);
const boolFields = new Set([
  'billable',
  'billed',
  'isLogged',
  'complete',
  'active',
  'compound',
  'isCogs'
]);
const decimalFields = new Set(['discountValue', 'fixedPrice', 'rate', 'inventory']);
const numeric = (value: unknown) => {
  const decimalText =
    typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value) ? value : undefined;
  if (decimalText !== undefined) value = Number(decimalText);
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (Number.isInteger(value) && !Number.isSafeInteger(value))
  )
    unexpected();
  if (
    decimalText !== undefined &&
    canonicalDecimal(decimalText) !== canonicalDecimal(String(value))
  )
    unexpected();
  return value;
};
const boolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === '0') return false;
  if (value === 1 || value === '1') return true;
  return unexpected();
};
export const mapped = (kind: Kind, value: Row): Row => {
  const out: Row = { [resources[kind].id]: idOf(kind, value), raw: value };
  for (const [key, source] of Object.entries(fields[kind])) {
    let v = value[source];
    if (v === undefined) continue;
    if (v !== null) {
      if (numericFields.has(key) && !(kind === 'credit_notes' && key === 'status')) {
        v = numeric(v);
        if (!Number.isSafeInteger(v)) unexpected();
      }
      if (boolFields.has(key)) v = boolean(v);
      if (decimalFields.has(key) || (kind === 'taxes' && key === 'amount')) {
        if (typeof v === 'number') v = String(numeric(v));
        if (typeof v !== 'string') unexpected();
      }
    }
    out[key] = v;
  }
  if (
    kind === 'credit_notes' &&
    out.status !== undefined &&
    out.status !== null &&
    typeof out.status !== 'string'
  )
    out.status = String(numeric(out.status));
  if (
    out.currencyCode === undefined &&
    ['expenses', 'payments', 'invoices', 'estimates', 'credit_notes'].includes(kind) &&
    value.amount !== undefined &&
    value.amount !== null
  ) {
    const money = row(value.amount);
    if (money.code !== undefined) out.currencyCode = currency(money.code);
  }
  if (Array.isArray(value.lines))
    out.lines = value.lines.map(item => {
      const line = row(item);
      const out: Row = {
        name: line.name,
        unitCost: line.unit_cost,
        amount: line.amount,
        taxName1: line.taxName1,
        taxName2: line.taxName2
      };
      if (line.lineid !== undefined) out.lineId = resourceId(line.lineid, 'Line ID');
      for (const key of ['qty', 'taxAmount1', 'taxAmount2'])
        if (line[key] !== undefined) out[key] = line[key] === null ? null : numeric(line[key]);
      return out;
    });
  return out;
};
const inputMaps: Record<Exclude<Kind, 'expense_categories'>, Record<string, string>> = {
  clients: fields.clients,
  invoices: {
    customerId: 'customerid',
    createDate: 'create_date',
    dueOffsetDays: 'due_offset_days',
    currencyCode: 'currency_code',
    invoiceNumber: 'invoice_number',
    poNumber: 'po_number',
    discountValue: 'discount_value',
    terms: 'terms',
    notes: 'notes'
  },
  estimates: {
    customerId: 'customerid',
    createDate: 'create_date',
    currencyCode: 'currency_code',
    estimateNumber: 'estimate_number',
    poNumber: 'po_number',
    discountValue: 'discount_value',
    terms: 'terms',
    notes: 'notes'
  },
  payments: { invoiceId: 'invoiceid', date: 'date', paymentType: 'type', note: 'note' },
  expenses: {
    currencyCode: 'currency_code',
    date: 'date',
    categoryId: 'categoryid',
    vendorName: 'vendor',
    clientId: 'clientid',
    projectId: 'projectid',
    notes: 'notes',
    taxName1: 'taxName1',
    taxName2: 'taxName2',
    taxPercent1: 'taxPercent1',
    taxPercent2: 'taxPercent2'
  },
  time_entries: {
    duration: 'duration',
    startedAt: 'started_at',
    clientId: 'client_id',
    projectId: 'project_id',
    note: 'note',
    billable: 'billable',
    isLogged: 'is_logged'
  },
  projects: {
    title: 'title',
    clientId: 'client_id',
    projectType: 'project_type',
    fixedPrice: 'fixed_price',
    rate: 'rate',
    description: 'description',
    dueDate: 'due_date',
    complete: 'complete'
  },
  taxes: { name: 'name', amount: 'amount', compound: 'compound', number: 'number' },
  items: {
    name: 'name',
    description: 'description',
    inventory: 'inventory',
    sku: 'sku',
    tax1: 'tax1',
    tax2: 'tax2'
  },
  credit_notes: {
    customerId: 'clientid',
    createDate: 'create_date',
    currencyCode: 'currency_code',
    notes: 'notes'
  }
};
const validate = (key: string, value: unknown, kind: Kind): unknown => {
  if (key === 'email' && value !== '' && !z.email().safeParse(value).success)
    invalid('email must be a valid email address or an empty clearing value.');
  if (key === 'currencyCode') return currency(value);
  if (['createDate', 'date', 'dueDate'].includes(key)) return date(value, key);
  if (key === 'startedAt') return startedAt(value);
  if (key.endsWith('Id')) return resourceId(value, key);
  if (['duration', 'dueOffsetDays'].includes(key)) return integer(value, key);
  if (['tax1', 'tax2'].includes(key)) return integer(value, key);
  if (boolFields.has(key)) {
    if (typeof value !== 'boolean') invalid(`${key} must be a boolean.`);
    return value;
  }
  if (
    decimalFields.has(key) ||
    key.startsWith('taxPercent') ||
    (kind === 'taxes' && key === 'amount')
  )
    return decimal(
      value,
      key,
      key === 'discountValue' ||
        key.startsWith('taxPercent') ||
        (kind === 'taxes' && key === 'amount')
    );
  return text(value, key, true);
};
const filters: Record<string, string> = {
  searchEmail: 'search[email]',
  searchOrganization: 'search[organization_like]',
  searchFirstName: 'search[fname_like]',
  searchLastName: 'search[lname_like]',
  customerId: 'search[customerid]',
  clientId: 'search[clientid]',
  invoiceId: 'search[invoiceid]',
  categoryId: 'search[categoryid]',
  projectId: 'search[projectid]',
  status: 'search[statusid]',
  dateMin: 'search[date_min]',
  dateMax: 'search[date_max]',
  dateFrom: 'search[date_min]',
  dateTo: 'search[date_max]',
  invoiceNumber: 'search[invoice_number]'
};
const params = (input: Row, kind: Kind) => {
  const perPage = integer(input.perPage ?? 25, 'perPage', 1);
  if (perPage > 100) invalid('perPage must be at most 100.');
  const out: Record<string, string | number> = {
    page: integer(input.page ?? 1, 'page', kind === 'projects' ? 0 : 1),
    per_page: perPage
  };
  for (const [key, value] of Object.entries(input)) {
    if (
      value === undefined ||
      ['accountId', 'businessId', 'page', 'perPage', 'resourceType'].includes(key)
    )
      continue;
    if (kind === 'time_entries') {
      const names: Record<string, string> = {
        projectId: 'project_id',
        clientId: 'client_id',
        billable: 'billable',
        billed: 'billed',
        startedFrom: 'started_from',
        startedTo: 'started_to'
      };
      const name = names[key];
      if (!name) invalid(`Unsupported time-entry filter: ${key}.`);
      out[name] =
        typeof value === 'boolean'
          ? value
            ? 1
            : 0
          : key.endsWith('Id')
            ? resourceId(value, key)
            : `${date(value, key)}T00:00:00Z`;
    } else {
      const name = filters[key];
      if (!name) invalid(`Unsupported list filter: ${key}.`);
      out[name] = key.endsWith('Id')
        ? resourceId(value, key)
        : key === 'status'
          ? integer(value, key)
          : key.startsWith('date')
            ? date(value, key)
            : text(value, key);
    }
  }
  if (
    input.dateFrom !== undefined &&
    input.dateTo !== undefined &&
    String(input.dateFrom) > String(input.dateTo)
  )
    invalid('dateFrom must not be after dateTo.');
  if (
    input.dateMin !== undefined &&
    input.dateMax !== undefined &&
    String(input.dateMin) > String(input.dateMax)
  )
    invalid('dateMin must not be after dateMax.');
  if (
    input.startedFrom !== undefined &&
    input.startedTo !== undefined &&
    String(input.startedFrom) > String(input.startedTo)
  )
    invalid('startedFrom must not be after startedTo.');
  return out;
};
const moneyCode = async (client: FreshBooksClient, kind: Kind, input: Row, previous?: Row) => {
  if (input.currencyCode !== undefined) return currency(input.currencyCode);
  if (kind === 'payments') {
    const invoice = await client.get(
      'invoices',
      resourceId(input.invoiceId ?? previous?.invoiceid, 'invoiceId')
    );
    return currency(invoice.currency_code ?? row(invoice.amount).code);
  }
  const prior =
    previous?.currency_code ??
    (previous?.unit_cost && row(previous.unit_cost).code) ??
    (previous?.amount && row(previous.amount).code);
  if (prior !== undefined && prior !== null) return currency(prior);
  if (['invoices', 'estimates', 'credit_notes'].includes(kind)) {
    const customer = await client.get(
      'clients',
      resourceId(input.customerId ?? previous?.customerid ?? previous?.clientid, 'customerId')
    );
    return currency(customer.currency_code);
  }
  invalid('currencyCode is required for this new monetary value; no currency is guessed.');
};
const payload = async (
  client: FreshBooksClient,
  kind: Exclude<Kind, 'expense_categories'>,
  input: Row,
  previous?: Row
) => {
  const out: Row = {};
  for (const [key, source] of Object.entries(inputMaps[kind]))
    if (input[key] !== undefined) out[source] = validate(key, input[key], kind);
  if (
    kind === 'payments' &&
    previous !== undefined &&
    input.invoiceId !== undefined &&
    input.amount === undefined
  ) {
    const selectedCurrency = await moneyCode(client, kind, input, previous);
    if (currency(row(previous.amount).code) !== selectedCurrency)
      invalid('The selected invoice uses another currency. Supply a new payment amount.');
  }
  if (input.amount !== undefined && (kind === 'payments' || kind === 'expenses'))
    out.amount = {
      amount: decimal(input.amount, 'amount'),
      code: await moneyCode(client, kind, input, previous)
    };
  if (input.unitCost !== undefined && kind === 'items')
    out.unit_cost = {
      amount: decimal(input.unitCost, 'unitCost'),
      code: await moneyCode(client, kind, input, previous)
    };
  if (kind === 'credit_notes' && input.action === 'create') out.credit_type = 'goodwill';
  if (input.lines !== undefined) {
    if (!Array.isArray(input.lines) || !input.lines.length)
      invalid('lines must contain at least one line.');
    const code = await moneyCode(client, kind, input, previous);
    out.lines = input.lines.map(item => {
      const line = row(item);
      const quantity = line.qty;
      if (
        typeof quantity !== 'number' ||
        !Number.isFinite(quantity) ||
        quantity < 0 ||
        (Number.isInteger(quantity) && !Number.isSafeInteger(quantity))
      )
        invalid('Line qty must be a finite nonnegative number.');
      const out: Row = {
        name: text(line.name, 'Line name'),
        qty: quantity,
        unit_cost: { amount: decimal(line.unitCost, 'Line unitCost'), code }
      };
      for (const key of ['taxName1', 'taxName2'])
        if (line[key] !== undefined) out[key] = text(line[key], key, true);
      for (const key of ['taxAmount1', 'taxAmount2'])
        if (line[key] !== undefined) out[key] = decimal(line[key], key, true);
      return out;
    });
  }
  return out;
};
export const invoke = async <T extends z.ZodType>(key: string, ctx: Context, schema: T) => {
  const client = new FreshBooksClient(ctx.auth, ctx.input, ctx.config);
  if (key === 'get_identity')
    return {
      output: parseOutput(schema, await client.identity()),
      message: 'Discovered your identity and authorized account/business memberships.'
    };
  const operation = key.split('_')[0];
  let kind = key.slice(operation!.length + 1) as Kind;
  if (key === 'get_client') kind = 'clients';
  if (key === 'get_invoice') kind = 'invoices';
  if (key === 'get_resource' || key === 'list_resources')
    kind = ctx.input.resourceType as Kind;
  if (!(kind in resources)) invalid('Unsupported resource type.');
  if (operation === 'list') {
    const result = await client.list(kind, params(ctx.input, kind));
    const listKey =
      kind === 'time_entries'
        ? 'timeEntries'
        : kind === 'credit_notes'
          ? 'creditNotes'
          : kind === 'expense_categories'
            ? 'expenseCategories'
            : kind;
    const output =
      key === 'list_resources'
        ? {
            resourceType: kind,
            resources: result.records.map(value => mapped(kind, value)),
            totalCount: result.totalCount,
            currentPage: result.currentPage,
            totalPages: result.totalPages
          }
        : {
            [listKey]: result.records.map(value => mapped(kind, value)),
            totalCount: result.totalCount,
            currentPage: result.currentPage,
            totalPages: result.totalPages
          };
    return {
      output: parseOutput(schema, output),
      message: `Listed ${result.records.length} resources; provider total ${result.totalCount}, page ${result.currentPage} of ${result.totalPages}.`
    };
  }
  if (operation === 'get') {
    const id = resourceId(
      key === 'get_resource' ? ctx.input.resourceId : ctx.input[resources[kind].id],
      resources[kind].id
    );
    const record = await client.get(kind, id);
    return {
      output: parseOutput(
        schema,
        key === 'get_resource'
          ? { resourceType: kind, resourceId: id, resource: mapped(kind, record) }
          : mapped(kind, record)
      ),
      message: `Retrieved resource ${id}.`
    };
  }
  if (operation !== 'manage' || kind === 'expense_categories')
    invalid('Unsupported operation.');
  const action = ctx.input.action;
  if (!['create', 'update', 'delete', 'send', 'markAsSent'].includes(String(action)))
    invalid('Unsupported action.');
  if (action === 'send' && kind === 'estimates')
    invalid(
      'Estimate email delivery lacks a verified current request contract. Send this estimate in FreshBooks.'
    );
  const id =
    action === 'create'
      ? undefined
      : resourceId(ctx.input[resources[kind].id], resources[kind].id);
  if (action === 'create' && ctx.input[resources[kind].id] !== undefined)
    invalid('A resource ID must not be supplied for create.');
  if (['delete', 'send', 'markAsSent'].includes(String(action))) {
    const allowed = new Set([
      'action',
      'accountId',
      'businessId',
      resources[kind].id,
      ...(action === 'send' ? ['emailRecipients'] : [])
    ]);
    if (
      Object.entries(ctx.input).some(
        ([key, value]) => value !== undefined && !allowed.has(key)
      )
    )
      invalid('Lifecycle actions must not include unrelated update fields.');
  }
  if (action === 'create') {
    const required: Partial<Record<Kind, string[]>> = {
      invoices: ['customerId'],
      estimates: ['customerId'],
      payments: ['invoiceId', 'amount', 'date'],
      expenses: ['amount', 'date', 'categoryId'],
      projects: ['title', 'clientId', 'projectType'],
      time_entries: ['startedAt', 'duration', 'isLogged'],
      taxes: ['name'],
      items: ['name'],
      credit_notes: ['customerId']
    };
    for (const name of required[kind] ?? []) {
      if (ctx.input[name] === undefined)
        invalid(`${name} is required to create this resource.`);
      if (['name', 'title'].includes(name)) text(ctx.input[name], name);
    }
    if (
      kind === 'clients' &&
      !['firstName', 'lastName', 'organization', 'email'].some(
        key => typeof ctx.input[key] === 'string' && String(ctx.input[key]).trim()
      )
    )
      invalid(
        'Client creation requires a nonempty firstName, lastName, organization, or email.'
      );
  }
  const previous =
    id === undefined
      ? undefined
      : kind === 'credit_notes'
        ? await client.credit(id)
        : await client.get(kind, id);
  let data: Row;
  if (action === 'delete') data = { vis_state: 1 };
  else if (action === 'send') {
    const recipients = ctx.input.emailRecipients;
    if (
      !Array.isArray(recipients) ||
      !recipients.length ||
      recipients.some(value => !z.email().safeParse(value).success)
    )
      invalid('emailRecipients must be a nonempty list of email addresses.');
    data = { action_email: true, email_recipients: recipients };
  } else if (action === 'markAsSent') data = { action_mark_as_sent: true };
  else data = await payload(client, kind, ctx.input, previous);
  if (action === 'update' && !Object.keys(data).length)
    invalid('Supply at least one field to update.');
  const record = await client.write(
    kind,
    action as 'create' | 'update' | 'delete' | 'send' | 'markAsSent',
    data,
    id
  );
  const output = mapped(kind, record ?? previous ?? unexpected());
  if (record === undefined) {
    output.raw = previous;
    output.acknowledged = true;
    output.readbackRequired = true;
  }
  return {
    output: parseOutput(schema, output),
    message:
      action === 'delete'
        ? `FreshBooks accepted the removal request for resource ${id}. Accounting records retain history; verify inactive/deleted state before considering cleanup complete.`
        : `FreshBooks accepted ${String(action)} for resource ${idOf(kind, record ?? unexpected())}.`
  };
};
