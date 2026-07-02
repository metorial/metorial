import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let baseTransactionSchema = z.object({
  transactionId: z.string().describe('Unique transaction identifier'),
  operator: z.string().describe('Operator name'),
  locationId: z.string().describe('Location ID where the transaction occurred'),
  userName: z.string().describe('Username associated with the transaction'),
  actionDateGmt: z.string().describe('Transaction timestamp in GMT'),
  userAgent: z.string().describe('User agent of the device'),
  customer: z.string().describe('Customer identifier'),
  newsletter: z.string().describe('Newsletter opt-in status'),
  companyName: z.string().describe('Company name'),
  email: z.string().describe('Email address'),
  address: z.string().describe('Street address'),
  city: z.string().describe('City'),
  state: z.string().describe('State or province'),
  zip: z.string().describe('ZIP or postal code'),
  countryCode: z.string().describe('Country code'),
  phone: z.string().describe('Phone number')
});

let macTransactionSchema = baseTransactionSchema.extend({
  transactionType: z.literal('mac'),
  packageId: z.string().describe('Package ID'),
  question1: z.string().optional().describe('Custom capture question 1'),
  answer1: z.string().optional().describe('Custom capture answer 1'),
  question2: z.string().optional().describe('Custom capture question 2'),
  answer2: z.string().optional().describe('Custom capture answer 2'),
  question3: z.string().optional().describe('Custom capture question 3'),
  answer3: z.string().optional().describe('Custom capture answer 3'),
  question4: z.string().optional().describe('Custom capture question 4'),
  answer4: z.string().optional().describe('Custom capture answer 4'),
  question5: z.string().optional().describe('Custom capture question 5'),
  answer5: z.string().optional().describe('Custom capture answer 5')
});

let paymentTransactionSchema = baseTransactionSchema.extend({
  transactionType: z.enum(['voucher', 'paid']),
  amount: z.string().describe('Payment amount'),
  currency: z.string().describe('Payment currency'),
  language: z.string().describe('User language'),
  smsCountry: z.string().describe('SMS country')
});

let socialTransactionSchema = baseTransactionSchema.extend({
  transactionType: z.literal('social'),
  packageId: z.string().describe('Package ID'),
  socialId: z.string().describe('Social network user ID'),
  socialUsername: z.string().describe('Social network username'),
  socialLink: z.string().describe('Social profile URL'),
  socialGender: z.string().describe('Gender from social profile'),
  socialAgeRange: z.string().describe('Age range from social profile'),
  socialFollowersCount: z.string().describe('Followers count from social profile'),
  socialNetwork: z.string().describe('Social network name')
});

let transactionSchema = z.union([
  macTransactionSchema,
  paymentTransactionSchema,
  socialTransactionSchema
]);

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve access transaction records from your hotspot locations. Transactions represent individual access events and come in four types:
- **mac**: Device-based (MAC address) access events with optional custom data capture fields
- **voucher**: Access events using voucher codes, with payment details
- **social**: Access events via social network login, with social profile attributes
- **paid**: Direct payment access events, with payment details

Specify a transaction type to query. Can be filtered by location.`,
  instructions: [
    'You must specify a transactionType to query. Each type returns fields specific to that transaction category.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transactionType: z
        .enum(['mac', 'voucher', 'social', 'paid'])
        .describe('Type of transaction to retrieve'),
      locationId: z
        .string()
        .optional()
        .describe(
          'Filter transactions by a specific location ID. Omit to retrieve across all locations.'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of transactions to return per page'),
      offset: z.number().optional().describe('Zero-based page offset for pagination'),
      sort: z
        .string()
        .optional()
        .describe('Property to sort by; prefix with - for descending order')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of transactions matching the query'),
      transactions: z.array(transactionSchema).describe('List of transaction records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { transactionType, locationId, limit, offset, sort } = ctx.input;
    let queryParams = { locationId, limit, offset, sort };

    let mapBase = (t: any) => ({
      transactionId: String(t.id ?? ''),
      operator: t.operator ?? '',
      locationId: String(t.location_id ?? ''),
      userName: t.user_name ?? '',
      actionDateGmt: t.action_date_gmt ?? '',
      userAgent: t.user_agent ?? '',
      customer: t.customer ?? '',
      newsletter: t.newsletter ?? '',
      companyName: t.company_name ?? '',
      email: t.email ?? '',
      address: t.address ?? '',
      city: t.city ?? '',
      state: t.state ?? '',
      zip: t.zip ?? '',
      countryCode: t.country_code ?? '',
      phone: t.phone ?? ''
    });

    if (transactionType === 'mac') {
      let result = await client.getMacTransactions(queryParams);
      let transactions = (result.items ?? []).map(t => ({
        ...mapBase(t),
        transactionType: 'mac' as const,
        packageId: t.package_id ?? '',
        question1: t.q1 || undefined,
        answer1: t.a1 || undefined,
        question2: t.q2 || undefined,
        answer2: t.a2 || undefined,
        question3: t.q3 || undefined,
        answer3: t.a3 || undefined,
        question4: t.q4 || undefined,
        answer4: t.a4 || undefined,
        question5: t.q5 || undefined,
        answer5: t.a5 || undefined
      }));

      return {
        output: { totalCount: result.metadata.total_count, transactions },
        message: `Retrieved ${transactions.length} MAC transactions (${result.metadata.total_count} total).`
      };
    }

    if (transactionType === 'social') {
      let result = await client.getSocialTransactions(queryParams);
      let transactions = (result.items ?? []).map(t => ({
        ...mapBase(t),
        transactionType: 'social' as const,
        packageId: t.package_id ?? '',
        socialId: t.social_id ?? '',
        socialUsername: t.social_username ?? '',
        socialLink: t.social_link ?? '',
        socialGender: t.social_gender ?? '',
        socialAgeRange: t.social_age_range ?? '',
        socialFollowersCount: t.social_followers_count ?? '',
        socialNetwork: t.social_network ?? ''
      }));

      return {
        output: { totalCount: result.metadata.total_count, transactions },
        message: `Retrieved ${transactions.length} social transactions (${result.metadata.total_count} total).`
      };
    }

    if (transactionType === 'voucher') {
      let result = await client.getVoucherTransactions(queryParams);
      let transactions = (result.items ?? []).map(t => ({
        ...mapBase(t),
        transactionType: 'voucher' as const,
        amount: t.amount ?? '',
        currency: t.currency ?? '',
        language: t.language ?? '',
        smsCountry: t.smscountry ?? ''
      }));

      return {
        output: { totalCount: result.metadata.total_count, transactions },
        message: `Retrieved ${transactions.length} voucher transactions (${result.metadata.total_count} total).`
      };
    }

    // paid
    let result = await client.getPaidTransactions(queryParams);
    let transactions = (result.items ?? []).map(t => ({
      ...mapBase(t),
      transactionType: 'paid' as const,
      amount: t.amount ?? '',
      currency: t.currency ?? '',
      language: t.language ?? '',
      smsCountry: t.smscountry ?? ''
    }));

    return {
      output: { totalCount: result.metadata.total_count, transactions },
      message: `Retrieved ${transactions.length} paid transactions (${result.metadata.total_count} total).`
    };
  })
  .build();
