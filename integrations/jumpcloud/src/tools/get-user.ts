import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific JumpCloud user by their ID. Returns full user profile including contact info, employment details, security settings, custom attributes, and account status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('JumpCloud user ID')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      username: z.string().describe('Username'),
      email: z.string().describe('Primary email'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      displayname: z.string().optional().describe('Display name'),
      state: z.string().optional().describe('Account state'),
      activated: z.boolean().optional().describe('Whether account is activated'),
      suspended: z.boolean().optional().describe('Whether account is suspended'),
      company: z.string().optional().describe('Company'),
      department: z.string().optional().describe('Department'),
      jobTitle: z.string().optional().describe('Job title'),
      employeeIdentifier: z.string().optional().describe('Employee ID'),
      employeeType: z.string().optional().describe('Employee type'),
      location: z.string().optional().describe('Location'),
      alternateEmail: z.string().optional().describe('Alternate email'),
      description: z.string().optional().describe('Description'),
      created: z.string().optional().describe('Account creation date'),
      ldapBindingUser: z.boolean().optional().describe('Whether this is an LDAP binding user'),
      enableMfa: z.boolean().optional().describe('Whether MFA is enabled'),
      passwordNeverExpires: z.boolean().optional().describe('Whether password never expires'),
      passwordlessSudo: z
        .boolean()
        .optional()
        .describe('Whether passwordless sudo is allowed'),
      externallyManaged: z.boolean().optional().describe('Whether user is externally managed'),
      attributes: z
        .array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Custom attributes'),
      phoneNumbers: z
        .array(
          z.object({
            number: z.string().optional(),
            type: z.string().optional()
          })
        )
        .optional()
        .describe('Phone numbers'),
      addresses: z
        .array(
          z.object({
            country: z.string().optional(),
            locality: z.string().optional(),
            region: z.string().optional(),
            postalCode: z.string().optional(),
            streetAddress: z.string().optional(),
            type: z.string().optional()
          })
        )
        .optional()
        .describe('Addresses'),
      mfaConfigured: z.boolean().optional().describe('Whether MFA is configured')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let user = await client.getUser(ctx.input.userId);

    return {
      output: {
        userId: user._id,
        username: user.username,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        displayname: user.displayname,
        state: user.state,
        activated: user.activated,
        suspended: user.suspended,
        company: user.company,
        department: user.department,
        jobTitle: user.jobTitle,
        employeeIdentifier: user.employeeIdentifier,
        employeeType: user.employeeType,
        location: user.location,
        alternateEmail: user.alternateEmail,
        description: user.description,
        created: user.created,
        ldapBindingUser: user.ldap_binding_user,
        enableMfa: user.enable_user_portal_multifactor,
        passwordNeverExpires: user.password_never_expires,
        passwordlessSudo: user.passwordless_sudo,
        externallyManaged: user.externally_managed,
        attributes: user.attributes,
        phoneNumbers: user.phoneNumbers,
        addresses: user.addresses,
        mfaConfigured: user.mfa?.configured
      },
      message: `Retrieved user **${user.username}** (${user.email}) — state: ${user.state}`
    };
  })
  .build();
