import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { type BatchValidationResult, Client, type ValidationResult } from '../lib/client';
import { spec } from '../spec';

let emailResultSchema = z.object({
  address: z.string().describe('The email address that was validated'),
  status: z
    .string()
    .describe(
      'Validation status: valid, invalid, catch-all, unknown, spamtrap, abuse, or do_not_mail'
    ),
  subStatus: z.string().describe('Detailed sub-status code providing additional context'),
  freeEmail: z.boolean().describe('Whether the email is from a free email provider'),
  catchallDomain: z
    .boolean()
    .nullable()
    .optional()
    .describe('Whether the domain accepts mail for any address, when available'),
  activeFirstSeen: z
    .string()
    .nullable()
    .optional()
    .describe('First date when activity was detected, when available'),
  didYouMean: z
    .string()
    .nullable()
    .describe('Suggested correction if a possible typo was detected'),
  account: z.string().nullable().describe('The local part of the email address'),
  domain: z.string().nullable().describe('The domain of the email address'),
  domainAgeDays: z.string().nullable().describe('Age of the domain in days'),
  activeInDays: z
    .string()
    .nullable()
    .optional()
    .describe('Days since last activity, if activity data was requested'),
  smtpProvider: z.string().nullable().describe('The SMTP provider for the domain'),
  mxRecord: z.string().nullable().describe('The MX record of the domain'),
  mxFound: z.string().describe('Whether an MX record was found'),
  firstName: z
    .string()
    .nullable()
    .describe('First name associated with the email, if available'),
  lastName: z
    .string()
    .nullable()
    .describe('Last name associated with the email, if available'),
  gender: z.string().nullable().describe('Gender associated with the email, if available'),
  country: z.string().nullable().describe('Country associated with the email, if available'),
  region: z
    .string()
    .nullable()
    .describe('Region/state associated with the email, if available'),
  city: z.string().nullable().describe('City associated with the email, if available'),
  zipcode: z.string().nullable().describe('Zip code associated with the email, if available'),
  processedAt: z.string().describe('UTC timestamp when the validation was processed')
});

export let validateEmail = SlateTool.create(spec, {
  name: 'Validate Email',
  key: 'validate_email',
  description: `Validates one or more email addresses in real time to determine deliverability status.
Returns detailed information including status (valid, invalid, catch-all, unknown, spamtrap, abuse, do_not_mail), enrichment data (name, gender, location), domain details (age, MX records, SMTP provider), and optionally activity data.
For a single email, pass it directly. For multiple emails (up to 200), pass an array to use batch validation in groups of up to 100.`,
  instructions: [
    'Provide a single email or a list of up to 200 emails for batch validation.',
    'Optionally enable activity data or Verify+ mode for enhanced results.'
  ],
  constraints: [
    'Accepts up to 200 emails per invocation, processed sequentially in batches of up to 100.',
    'The timeout parameter ranges from 3-60 seconds for single validation, 10-120 seconds for batch.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      emails: z
        .union([
          z.string().describe('A single email address to validate'),
          z
            .array(
              z.object({
                emailAddress: z.string().describe('Email address to validate'),
                ipAddress: z
                  .string()
                  .optional()
                  .describe('IP address the email signed up from')
              })
            )
            .min(1)
            .max(200)
            .describe('Array of emails (up to 200) for batch validation')
        ])
        .describe('Email address(es) to validate'),
      ipAddress: z
        .string()
        .optional()
        .describe('IP address the email signed up from (single validation only)'),
      timeout: z
        .number()
        .optional()
        .describe(
          'Seconds to wait before returning unknown/greylisted (3-60 for single, 10-120 for batch)'
        ),
      activityData: z
        .boolean()
        .optional()
        .describe('Set to true to append activity data to results'),
      verifyPlus: z
        .boolean()
        .optional()
        .describe('Set to true to use enhanced Verify+ validation')
    })
  )
  .output(
    z.object({
      results: z.array(emailResultSchema).describe('Validation results for each email'),
      errors: z
        .array(
          z.object({
            emailAddress: z.string().optional(),
            error: z.string().optional()
          })
        )
        .optional()
        .describe('Any errors encountered during batch validation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let emails = ctx.input.emails;
    let isBatch = Array.isArray(emails);
    let minimumTimeout = isBatch ? 10 : 3;
    let maximumTimeout = isBatch ? 120 : 60;
    if (
      ctx.input.timeout !== undefined &&
      (!Number.isInteger(ctx.input.timeout) ||
        ctx.input.timeout < minimumTimeout ||
        ctx.input.timeout > maximumTimeout)
    ) {
      throw createApiServiceError(
        `timeout must be an integer from ${minimumTimeout} to ${maximumTimeout} seconds for ${isBatch ? 'batch' : 'single'} validation.`
      );
    }
    if (Array.isArray(emails)) {
      if (ctx.input.ipAddress !== undefined) {
        throw createApiServiceError(
          'For batch validation, provide ipAddress inside each emails item.'
        );
      }
      if (emails.some(email => !email.emailAddress.trim())) {
        throw createApiServiceError(
          'Every emails item must contain a non-empty emailAddress.'
        );
      }
      ctx.info(`Validating batch of ${emails.length} emails`);

      let responses: BatchValidationResult[] = [];
      for (let offset = 0; offset < emails.length; offset += 100) {
        responses.push(
          await client.validateBatch({
            emails: emails.slice(offset, offset + 100),
            timeout: ctx.input.timeout,
            activityData: ctx.input.activityData,
            verifyPlus: ctx.input.verifyPlus
          })
        );
      }
      let mapped = responses.flatMap(result => result.email_batch.map(mapValidationResult));
      let errors = responses.flatMap(result =>
        (result.errors || []).map(error => ({
          emailAddress: error.email_address,
          error: error.error
        }))
      );

      return {
        output: {
          results: mapped,
          errors
        },
        message: `Received **${mapped.length}** results for **${emails.length}** submitted emails (${errors.length} errors). ${mapped.filter((r: { status: string }) => r.status === 'valid').length} valid, ${mapped.filter((r: { status: string }) => r.status === 'invalid').length} invalid.`
      };
    } else {
      let email = emails;
      if (!email.trim()) {
        throw createApiServiceError('Provide a non-empty email address to validate.');
      }
      ctx.info(`Validating email: ${email}`);

      let result = await client.validateEmail({
        email,
        ipAddress: ctx.input.ipAddress,
        timeout: ctx.input.timeout,
        activityData: ctx.input.activityData,
        verifyPlus: ctx.input.verifyPlus
      });

      let mapped = mapValidationResult(result);

      return {
        output: {
          results: [mapped]
        },
        message: `Email **${email}** is **${mapped.status}**${mapped.subStatus ? ` (${mapped.subStatus})` : ''}.`
      };
    }
  })
  .build();

let mapValidationResult = (r: ValidationResult) => ({
  address: String(r.address || ''),
  status: String(r.status || ''),
  subStatus: String(r.sub_status || ''),
  freeEmail: r.free_email === true,
  catchallDomain: r.catchall_domain ?? null,
  activeFirstSeen: r.active_first_seen ?? null,
  didYouMean: r.did_you_mean ?? null,
  account: r.account ?? null,
  domain: r.domain ?? null,
  domainAgeDays: r.domain_age_days ?? null,
  activeInDays: r.active_in_days ?? null,
  smtpProvider: r.smtp_provider ?? null,
  mxRecord: r.mx_record ?? null,
  mxFound: String(r.mx_found ?? ''),
  firstName: r.firstname ?? null,
  lastName: r.lastname ?? null,
  gender: r.gender ?? null,
  country: r.country ?? null,
  region: r.region ?? null,
  city: r.city ?? null,
  zipcode: r.zipcode ?? null,
  processedAt: String(r.processed_at || '')
});
