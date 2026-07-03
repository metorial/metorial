import { SlateAuth } from 'slates';
import { z } from 'zod';
import {
  asString,
  createJenkinsClient,
  type JenkinsAuth,
  normalizeJenkinsAuth
} from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      baseUrl: z.string().describe('Normalized Jenkins controller base URL.'),
      username: z.string().describe('Jenkins username used for Basic authentication.'),
      apiToken: z.string().describe('Jenkins API token used for Basic authentication.'),
      jenkinsVersion: z
        .string()
        .optional()
        .describe('Jenkins version detected from the controller, when available.')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Jenkins API Token',
    key: 'api_token',
    docs: [
      {
        type: 'docs.auth.custom',
        name: 'Jenkins Remote Access API authentication',
        url: 'https://www.jenkins.io/doc/book/system-administration/authenticating-scripted-clients/'
      }
    ],
    inputSchema: z.object({
      baseUrl: z
        .string()
        .min(1)
        .describe('Base URL of the Jenkins controller, such as https://jenkins.example.com.'),
      username: z.string().min(1).describe('Jenkins username.'),
      apiToken: z
        .string()
        .min(1)
        .describe('Jenkins API token from the user configuration page.')
    }),
    getOutput: async ctx => {
      let output = normalizeJenkinsAuth({
        baseUrl: ctx.input.baseUrl,
        username: ctx.input.username,
        apiToken: ctx.input.apiToken
      });

      let client = createJenkinsClient({ auth: output });
      let status = await client.getRoot();
      output.jenkinsVersion = status.version;

      return { output };
    },
    getProfile: async (ctx: { output: JenkinsAuth }) => {
      let client = createJenkinsClient({ auth: ctx.output });
      let me = await client.getMe();
      let id =
        asString(me.id) ??
        asString(me.absoluteUrl) ??
        asString(me.fullName) ??
        ctx.output.username;
      let name = asString(me.fullName) ?? ctx.output.username;

      return {
        profile: {
          id,
          name,
          username: ctx.output.username,
          baseUrl: ctx.output.baseUrl,
          jenkinsVersion: ctx.output.jenkinsVersion
        }
      };
    }
  });
