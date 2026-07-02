import { SlateTool } from 'slates';
import { z } from 'zod';
import { powerOfficeValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  buildListParams,
  compactOutput,
  createClient,
  numberValue,
  pageSummary,
  paginationInputSchema,
  paginationOutputSchema,
  rawRecordSchema,
  stringValue
} from './shared';

let generalLedgerAccountSchema = z.object({
  id: z.number().optional().describe('General ledger account id.'),
  accountNo: z.number().optional().describe('General ledger account number.'),
  name: z.string().optional().describe('Account name.'),
  accountType: z.string().optional().describe('Account type.'),
  vatCode: z.string().optional().describe('Default VAT code.'),
  vatCodeId: z.number().optional().describe('Default VAT code id.'),
  currencyCode: z.string().optional().describe('Currency code.'),
  departmentCode: z.string().optional().describe('Department code.'),
  departmentId: z.number().optional().describe('Department id.'),
  isActive: z.boolean().optional().describe('Whether the account is active.'),
  isDepartmentRequired: z.boolean().optional().describe('Whether department is required.'),
  isProjectRequired: z.boolean().optional().describe('Whether project is required.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  record: rawRecordSchema
});

let vatCodeSchema = z.object({
  id: z.number().optional().describe('VAT code id.'),
  code: z.string().optional().describe('VAT code.'),
  name: z.string().optional().describe('VAT code name.'),
  description: z.string().optional().describe('VAT code description.'),
  rate: z.number().optional().describe('VAT rate.'),
  isActive: z.boolean().optional().describe('Whether the VAT code is active.'),
  isCustom: z.boolean().optional().describe('Whether the VAT code is custom.'),
  validFrom: z.string().optional().describe('Valid from date.'),
  validTo: z.string().optional().describe('Valid to date.'),
  record: rawRecordSchema
});

let salesSettingSchema = z.object({
  id: z.number().optional().describe('Setting id.'),
  code: z.string().optional().describe('Setting code where applicable.'),
  name: z.string().optional().describe('Setting name.'),
  creditDays: z.number().optional().describe('Payment term credit days.'),
  languageCode: z.string().optional().describe('Branding theme language code.'),
  isActive: z.boolean().optional().describe('Whether the setting is active.'),
  isDefault: z.boolean().optional().describe('Whether this is the default setting.'),
  createdDateTimeOffset: z.string().optional().describe('Created timestamp.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  record: rawRecordSchema
});

let currencySchema = z.object({
  code: z.string().optional().describe('Currency code.'),
  notation: z.string().optional().describe('Currency notation.'),
  isActive: z.boolean().optional().describe('Whether the currency is active.'),
  record: rawRecordSchema
});

let currencyRateSchema = z.object({
  currencyCode: z.string().optional().describe('Currency code.'),
  exchangeBase: z.number().optional().describe('Exchange base.'),
  exchangeRate: z.number().optional().describe('Exchange rate.'),
  reverseExchangeRate: z.number().optional().describe('Reverse exchange rate.'),
  rateDate: z.string().optional().describe('Rate date.'),
  record: rawRecordSchema
});

let financialSettingsSchema = z.object({
  currencyCode: z.string().optional().describe('Client currency code.'),
  conversionDate: z.string().optional().describe('Conversion date.'),
  financialYearEndMonth: z.string().optional().describe('Financial year end month.'),
  currencyGainsAccountNo: z.number().optional().describe('Currency gains account number.'),
  currencyLossAccountNo: z.number().optional().describe('Currency loss account number.'),
  useTrustAccountManagement: z
    .boolean()
    .optional()
    .describe('Whether trust account management is enabled.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  record: rawRecordSchema
});

let mapGeneralLedgerAccount = (account: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(account, 'Id'),
    accountNo: numberValue(account, 'AccountNo'),
    name: stringValue(account, 'Name'),
    accountType: stringValue(account, 'GeneralLedgerAccountType'),
    vatCode: stringValue(account, 'VatCode'),
    vatCodeId: numberValue(account, 'VatCodeId'),
    currencyCode: stringValue(account, 'CurrencyCode'),
    departmentCode: stringValue(account, 'DepartmentCode'),
    departmentId: numberValue(account, 'DepartmentId'),
    isActive:
      typeof account.IsActive === 'boolean' ? (account.IsActive as boolean) : undefined,
    isDepartmentRequired:
      typeof account.IsDepartmentRequired === 'boolean'
        ? (account.IsDepartmentRequired as boolean)
        : undefined,
    isProjectRequired:
      typeof account.IsProjectRequired === 'boolean'
        ? (account.IsProjectRequired as boolean)
        : undefined,
    lastChangedDateTimeOffset: stringValue(account, 'LastChangedDateTimeOffset')
  }),
  record: account
});

let mapVatCode = (vatCode: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(vatCode, 'Id'),
    code: stringValue(vatCode, 'Code'),
    name: stringValue(vatCode, 'Name'),
    description: stringValue(vatCode, 'Description'),
    rate: numberValue(vatCode, 'Rate'),
    isActive:
      typeof vatCode.IsActive === 'boolean' ? (vatCode.IsActive as boolean) : undefined,
    isCustom:
      typeof vatCode.IsCustom === 'boolean' ? (vatCode.IsCustom as boolean) : undefined,
    validFrom: stringValue(vatCode, 'ValidFrom'),
    validTo: stringValue(vatCode, 'ValidTo')
  }),
  record: vatCode
});

let mapSalesSetting = (setting: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(setting, 'Id'),
    code: stringValue(setting, 'Code'),
    name: stringValue(setting, 'Name'),
    creditDays: numberValue(setting, 'CreditDays'),
    languageCode: stringValue(setting, 'LanguageCode'),
    isActive:
      typeof setting.IsActive === 'boolean' ? (setting.IsActive as boolean) : undefined,
    isDefault:
      typeof setting.IsDefault === 'boolean' ? (setting.IsDefault as boolean) : undefined,
    createdDateTimeOffset: stringValue(setting, 'CreatedDateTimeOffset'),
    lastChangedDateTimeOffset: stringValue(setting, 'LastChangedDateTimeOffset')
  }),
  record: setting
});

let mapCurrency = (currency: Record<string, unknown>) => ({
  ...compactOutput({
    code: stringValue(currency, 'Code'),
    notation: stringValue(currency, 'Notation'),
    isActive:
      typeof currency.IsActive === 'boolean' ? (currency.IsActive as boolean) : undefined
  }),
  record: currency
});

let mapCurrencyRate = (rate: Record<string, unknown>) => ({
  ...compactOutput({
    currencyCode: stringValue(rate, 'CurrencyCode'),
    exchangeBase: numberValue(rate, 'ExchangeBase'),
    exchangeRate: numberValue(rate, 'ExchangeRate'),
    reverseExchangeRate: numberValue(rate, 'ReverseExchangeRate'),
    rateDate: stringValue(rate, 'RateDate')
  }),
  record: rate
});

let mapFinancialSettings = (settings: Record<string, unknown>) => ({
  ...compactOutput({
    currencyCode: stringValue(settings, 'CurrencyCode'),
    conversionDate: stringValue(settings, 'ConversionDate'),
    financialYearEndMonth: stringValue(settings, 'FinancialYearEndMonth'),
    currencyGainsAccountNo: numberValue(settings, 'CurrencyGainsAccountNo'),
    currencyLossAccountNo: numberValue(settings, 'CurrencyLossAccountNo'),
    useTrustAccountManagement:
      typeof settings.UseTrustAccountManagement === 'boolean'
        ? (settings.UseTrustAccountManagement as boolean)
        : undefined,
    lastChangedDateTimeOffset: stringValue(settings, 'LastChangedDateTimeOffset')
  }),
  record: settings
});

export let powerofficeListGeneralLedgerAccounts = SlateTool.create(spec, {
  name: 'List PowerOffice General Ledger Accounts',
  key: 'poweroffice_list_general_ledger_accounts',
  description:
    'List PowerOffice general ledger accounts for account selection, sales/product setup, voucher lines, and reporting filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountNos: z
        .string()
        .optional()
        .describe('Account numbers or ranges, for example "3000-3999".'),
      agricultureDepartments: z
        .string()
        .optional()
        .describe('Agriculture departments filter.'),
      lastChangedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return accounts changed after this timestamp.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      accounts: z.array(generalLedgerAccountSchema).describe('General ledger accounts.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let accounts = await client.listGeneralLedgerAccounts(
      buildListParams(ctx.input, {
        accountNos: ctx.input.accountNos,
        agricultureDepartments: ctx.input.agricultureDepartments,
        lastChangedDateTimeOffsetGreaterThan: ctx.input.lastChangedDateTimeOffsetGreaterThan
      })
    );

    return {
      output: {
        accounts: accounts.map(mapGeneralLedgerAccount),
        page: pageSummary(ctx.input, accounts.length)
      },
      message: `Retrieved **${accounts.length}** PowerOffice general ledger account(s).`
    };
  })
  .build();

export let powerofficeListVatCodes = SlateTool.create(spec, {
  name: 'List PowerOffice VAT Codes',
  key: 'poweroffice_list_vat_codes',
  description:
    'List PowerOffice VAT codes for product, invoice, voucher, and accounting workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeExpired: z.boolean().optional().describe('Include expired VAT codes.'),
      isActive: z.boolean().optional().describe('Filter active/inactive VAT codes.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      vatCodes: z.array(vatCodeSchema).describe('VAT codes.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let vatCodes = await client.listVatCodes(
      buildListParams(ctx.input, {
        includeExpired: ctx.input.includeExpired,
        isActive: ctx.input.isActive
      })
    );

    return {
      output: {
        vatCodes: vatCodes.map(mapVatCode),
        page: pageSummary(ctx.input, vatCodes.length)
      },
      message: `Retrieved **${vatCodes.length}** PowerOffice VAT code(s).`
    };
  })
  .build();

export let powerofficeListSalesSettings = SlateTool.create(spec, {
  name: 'List PowerOffice Sales Settings',
  key: 'poweroffice_list_sales_settings',
  description:
    'List PowerOffice sales settings such as payment terms, delivery terms, and branding themes used by customers, projects, and sales orders.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resource: z
        .enum(['payment_terms', 'delivery_terms', 'branding_themes'])
        .describe('Sales setting resource to list.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      resource: z.enum(['payment_terms', 'delivery_terms', 'branding_themes']),
      settings: z.array(salesSettingSchema).describe('Sales settings.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let params = buildListParams(ctx.input);
    let settings =
      ctx.input.resource === 'payment_terms'
        ? await client.listPaymentTerms(params)
        : ctx.input.resource === 'delivery_terms'
          ? await client.listDeliveryTerms(params)
          : await client.listBrandingThemes(params);

    return {
      output: {
        resource: ctx.input.resource,
        settings: settings.map(mapSalesSetting),
        page: pageSummary(ctx.input, settings.length)
      },
      message: `Retrieved **${settings.length}** PowerOffice sales setting(s).`
    };
  })
  .build();

export let powerofficeListFinancialSettings = SlateTool.create(spec, {
  name: 'List PowerOffice Financial Settings',
  key: 'poweroffice_list_financial_settings',
  description:
    'Read PowerOffice financial settings, currencies, or a currency rate for accounting and sales workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resource: z
        .enum(['financial_settings', 'currencies', 'currency_rate'])
        .describe('Financial resource to read.'),
      currencyCode: z
        .string()
        .optional()
        .describe('Currency code filter for currencies resource.'),
      isActive: z.boolean().optional().describe('Active currency filter.'),
      fromCurrency: z
        .string()
        .optional()
        .describe('Source currency for resource "currency_rate".'),
      toCurrency: z
        .string()
        .optional()
        .describe('Target currency for resource "currency_rate".'),
      asOnDate: z
        .string()
        .optional()
        .describe('Currency rate date for resource "currency_rate" (YYYY-MM-DD).'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      resource: z.enum(['financial_settings', 'currencies', 'currency_rate']),
      currencies: z.array(currencySchema).optional().describe('Currencies list.'),
      currencyRate: currencyRateSchema.optional().describe('Currency rate result.'),
      financialSettings: financialSettingsSchema
        .optional()
        .describe('Financial settings result.'),
      page: paginationOutputSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.resource === 'financial_settings') {
      let settings = await client.getFinancialSettings();
      return {
        output: {
          resource: ctx.input.resource,
          financialSettings: mapFinancialSettings(settings)
        },
        message: 'Retrieved PowerOffice financial settings.'
      };
    }

    if (ctx.input.resource === 'currency_rate') {
      if (!ctx.input.fromCurrency || !ctx.input.toCurrency || !ctx.input.asOnDate) {
        throw powerOfficeValidationError(
          'fromCurrency, toCurrency, and asOnDate are required when resource is currency_rate.'
        );
      }

      let rate = await client.getCurrencyRate({
        fromCurrency: ctx.input.fromCurrency,
        toCurrency: ctx.input.toCurrency,
        asOnDate: ctx.input.asOnDate
      });

      return {
        output: {
          resource: ctx.input.resource,
          currencyRate: mapCurrencyRate(rate)
        },
        message: `Retrieved PowerOffice currency rate from **${ctx.input.fromCurrency}** to **${ctx.input.toCurrency}**.`
      };
    }

    let currencies = await client.listCurrencies(
      buildListParams(ctx.input, {
        currencyCode: ctx.input.currencyCode,
        isActive: ctx.input.isActive
      })
    );

    return {
      output: {
        resource: ctx.input.resource,
        currencies: currencies.map(mapCurrency),
        page: pageSummary(ctx.input, currencies.length)
      },
      message: `Retrieved **${currencies.length}** PowerOffice currenc${currencies.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();
