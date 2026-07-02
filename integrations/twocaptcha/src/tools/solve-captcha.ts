import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoCaptchaClient } from '../lib/client';
import { spec } from '../spec';

let proxySchema = z
  .object({
    proxyType: z.enum(['http', 'https', 'socks4', 'socks5']).describe('Proxy protocol type'),
    proxyAddress: z.string().describe('Proxy IP address or hostname'),
    proxyPort: z.number().describe('Proxy port number'),
    proxyLogin: z.string().optional().describe('Proxy authentication username'),
    proxyPassword: z.string().optional().describe('Proxy authentication password')
  })
  .optional()
  .describe(
    'Proxy configuration for IP-matching requirements. When provided, the task type automatically switches to the proxy variant.'
  );

export let solveCaptcha = SlateTool.create(spec, {
  name: 'Solve Captcha',
  key: 'solve_captcha',
  description: `Submit an interactive/token-based captcha for solving and receive a task ID. Supports reCAPTCHA V2, reCAPTCHA V3, hCaptcha, Arkose Labs (FunCaptcha), GeeTest (v3/v4), and Cloudflare Turnstile.
The task is processed asynchronously — use **Get Task Result** to poll for the solution.
Proxy configuration is optional; when provided, the proxy variant of the task type is used automatically.`,
  instructions: [
    'Use the captchaType field to select which captcha type to solve.',
    'After submitting, poll the task result using the returned taskId.',
    'For reCAPTCHA V3, specify pageAction and minScore for best results.',
    'Provide proxy details when the captcha solution must originate from a specific IP.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      captchaType: z
        .enum(['recaptchaV2', 'recaptchaV3', 'hcaptcha', 'funcaptcha', 'geetest', 'turnstile'])
        .describe('Type of captcha to solve'),

      websiteUrl: z.string().describe('Full URL of the page where the captcha is loaded'),
      websiteKey: z
        .string()
        .optional()
        .describe(
          'Site key / public key for the captcha (required for all types except GeeTest)'
        ),

      // reCAPTCHA V2 specific
      isInvisible: z
        .boolean()
        .optional()
        .describe('Set to true for invisible reCAPTCHA V2 or invisible hCaptcha'),
      recaptchaDataSValue: z
        .string()
        .optional()
        .describe('Value of the data-s parameter for Google search reCAPTCHA V2'),
      apiDomain: z
        .string()
        .optional()
        .describe('Domain used to load reCAPTCHA script (e.g. recaptcha.net)'),

      // reCAPTCHA V3 specific
      pageAction: z
        .string()
        .optional()
        .describe(
          'Action parameter for reCAPTCHA V3 (value of the "action" parameter in grecaptcha.execute)'
        ),
      minScore: z.number().optional().describe('Minimum score for reCAPTCHA V3 (0.1 to 0.9)'),
      isEnterprise: z.boolean().optional().describe('Set to true for reCAPTCHA Enterprise'),

      // FunCaptcha specific
      funcaptchaApiJSSubdomain: z
        .string()
        .optional()
        .describe('Custom subdomain used to load the FunCaptcha JS widget'),
      funcaptchaData: z
        .string()
        .optional()
        .describe('Additional data payload for FunCaptcha, serialized as JSON string'),

      // GeeTest specific
      gt: z
        .string()
        .optional()
        .describe('GeeTest gt parameter (public key, required for GeeTest)'),
      challenge: z
        .string()
        .optional()
        .describe('GeeTest challenge token (required for GeeTest v3)'),
      geetestApiServerSubdomain: z
        .string()
        .optional()
        .describe('GeeTest API server subdomain'),
      geetestVersion: z.number().optional().describe('GeeTest version: 3 or 4 (default: 3)'),
      initParameters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('GeeTest v4 initialization parameters (must include captcha_id)'),

      // Turnstile specific
      turnstileAction: z
        .string()
        .optional()
        .describe('Turnstile action parameter (cData.action value)'),
      turnstileData: z.string().optional().describe('Turnstile cData value'),
      turnstilePagedata: z.string().optional().describe('Turnstile pagedata value'),

      // hCaptcha specific
      enterprisePayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('hCaptcha Enterprise payload data'),

      // Common
      userAgent: z
        .string()
        .optional()
        .describe('Browser User-Agent to use when solving the captcha'),
      cookies: z
        .string()
        .optional()
        .describe('Cookies to use when solving (format: "name1=value1; name2=value2")'),
      proxy: proxySchema,
      languagePool: z
        .enum(['en', 'rn'])
        .optional()
        .describe('Language pool for workers: "en" (English) or "rn" (Russian)'),
      callbackUrl: z
        .string()
        .optional()
        .describe('URL where the solution will be sent via POST when ready')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the created task, use this to poll for results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoCaptchaClient({ token: ctx.auth.token });
    let task: Record<string, unknown>;

    switch (ctx.input.captchaType) {
      case 'recaptchaV2':
        task = client.buildRecaptchaV2Task({
          websiteUrl: ctx.input.websiteUrl,
          websiteKey: ctx.input.websiteKey!,
          isInvisible: ctx.input.isInvisible,
          recaptchaDataSValue: ctx.input.recaptchaDataSValue,
          apiDomain: ctx.input.apiDomain,
          userAgent: ctx.input.userAgent,
          cookies: ctx.input.cookies,
          proxy: ctx.input.proxy
        });
        break;

      case 'recaptchaV3':
        task = client.buildRecaptchaV3Task({
          websiteUrl: ctx.input.websiteUrl,
          websiteKey: ctx.input.websiteKey!,
          pageAction: ctx.input.pageAction,
          minScore: ctx.input.minScore,
          isEnterprise: ctx.input.isEnterprise,
          apiDomain: ctx.input.apiDomain,
          proxy: ctx.input.proxy
        });
        break;

      case 'hcaptcha':
        task = client.buildHCaptchaTask({
          websiteUrl: ctx.input.websiteUrl,
          websiteKey: ctx.input.websiteKey!,
          isInvisible: ctx.input.isInvisible,
          enterprisePayload: ctx.input.enterprisePayload,
          userAgent: ctx.input.userAgent,
          proxy: ctx.input.proxy
        });
        break;

      case 'funcaptcha':
        task = client.buildFunCaptchaTask({
          websiteUrl: ctx.input.websiteUrl,
          websitePublicKey: ctx.input.websiteKey!,
          funcaptchaApiJSSubdomain: ctx.input.funcaptchaApiJSSubdomain,
          data: ctx.input.funcaptchaData,
          userAgent: ctx.input.userAgent,
          proxy: ctx.input.proxy
        });
        break;

      case 'geetest':
        task = client.buildGeeTestTask({
          websiteUrl: ctx.input.websiteUrl,
          gt: ctx.input.gt!,
          challenge: ctx.input.challenge,
          geetestApiServerSubdomain: ctx.input.geetestApiServerSubdomain,
          version: ctx.input.geetestVersion,
          initParameters: ctx.input.initParameters,
          proxy: ctx.input.proxy
        });
        break;

      case 'turnstile':
        task = client.buildTurnstileTask({
          websiteUrl: ctx.input.websiteUrl,
          websiteKey: ctx.input.websiteKey!,
          action: ctx.input.turnstileAction,
          data: ctx.input.turnstileData,
          pagedata: ctx.input.turnstilePagedata,
          userAgent: ctx.input.userAgent,
          proxy: ctx.input.proxy
        });
        break;
    }

    let result = await client.createTask(task, {
      callbackUrl: ctx.input.callbackUrl,
      languagePool: ctx.input.languagePool
    });

    if (result.errorId !== 0) {
      throw new Error(`2Captcha error: ${result.errorCode} - ${result.errorDescription}`);
    }

    return {
      output: {
        taskId: result.taskId!
      },
      message: `**${ctx.input.captchaType}** task created with ID **${result.taskId}**. Poll using Get Task Result to retrieve the solution.`
    };
  })
  .build();
