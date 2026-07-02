import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProposal = SlateTool.create(spec, {
  name: 'Create Proposal',
  key: 'create_proposal',
  description: `Creates a new proposal in Better Proposals. Allows specifying the client company, cover design, template, document type, brand, currency, tax settings, contacts with signature requirements, and merge tags for dynamic content personalization.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      company: z
        .string()
        .optional()
        .describe('Company ID or company name to associate with the proposal'),
      coverId: z.string().optional().describe('Cover ID to assign to the proposal'),
      templateId: z
        .string()
        .optional()
        .describe('Template ID to use as the basis for the proposal'),
      documentType: z
        .string()
        .optional()
        .describe('Document type ID or name (defaults to "Proposal")'),
      brandId: z.string().optional().describe('Brand ID to apply to the proposal'),
      currency: z.string().optional().describe('Currency code, e.g. "usd"'),
      taxEnabled: z.boolean().optional().describe('Whether tax is enabled for this proposal'),
      taxLabel: z.string().optional().describe('Label for the tax (e.g. "VAT")'),
      taxAmount: z.string().optional().describe('Tax amount or percentage'),
      contacts: z
        .array(
          z.object({
            firstName: z.string().describe('First name of the contact'),
            surname: z.string().describe('Last name of the contact'),
            email: z.string().describe('Email address of the contact'),
            requiresSignature: z
              .boolean()
              .optional()
              .describe('Whether this contact needs to sign the proposal')
          })
        )
        .optional()
        .describe('List of contacts to receive the proposal'),
      mergeTags: z
        .array(
          z.object({
            tag: z.string().describe('Merge tag name'),
            value: z.string().describe('Value to substitute for the merge tag')
          })
        )
        .optional()
        .describe('Merge tags for dynamic content personalization')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      proposal: z.any().optional().describe('Created proposal data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createProposal({
      company: ctx.input.company,
      cover: ctx.input.coverId,
      template: ctx.input.templateId,
      documentType: ctx.input.documentType,
      brand: ctx.input.brandId,
      currency: ctx.input.currency,
      tax: ctx.input.taxEnabled,
      taxLabel: ctx.input.taxLabel,
      taxAmount: ctx.input.taxAmount,
      contacts: ctx.input.contacts?.map(c => ({
        firstName: c.firstName,
        surname: c.surname,
        email: c.email,
        signature: c.requiresSignature
      })),
      mergeTags: ctx.input.mergeTags
    });

    return {
      output: {
        status: result.status ?? 'success',
        proposal: result.data
      },
      message: `Proposal created successfully.`
    };
  })
  .build();
