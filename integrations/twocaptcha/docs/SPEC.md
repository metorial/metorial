# 2Captcha API Reference

The integration uses the [Captcha Solver API v2](https://2captcha.com/api-docs), with JSON POST requests to `https://api.2captcha.com`. Authentication is the account API key in the `clientKey` body property. No OAuth, scopes, additional configuration, or refresh tokens are required. This API documents no profile/current-user identity endpoint; `get_balance` is an account operation rather than an identity lookup. The separate residential Proxy API is outside this integration's scope.

| Tool | API method | Behavior |
| --- | --- | --- |
| `solve_captcha` | `createTask` | Guided task creation for reCAPTCHA V2/V3, Arkose Labs, GeeTest V3/V4, Turnstile, and the existing hCaptcha branch |
| `solve_image_captcha` | `createTask` | ImageToTextTask or TextCaptchaTask |
| `create_task` | `createTask` | Complete documented task object, with optional callback, worker language, and software ID |
| `get_task_result` | `getTaskResult` | One result request; actual status, solution, cost, timestamps, attempts, and raw response |
| `report_solution` | `reportCorrect` or `reportIncorrect` | Feedback after verifying the solution on the target site |
| `get_balance` | `getBalance` | Actual account balance in USD |

Each creation tool sends a single request and returns the provider task ID. It never waits, polls automatically, or retries a paid submission. A transport timeout does not establish whether submission failed; inspect the registered callback or account before resubmitting. A successful creation response without a valid task ID is reported as an error rather than inventing an identifier.

[getTaskResult](https://2captcha.com/api-docs/get-task-result) returns `processing` or `ready`. Wait at least five seconds between checks. Solution objects remain complete because each task type has its own fields. For Cloudflare challenge pages, retain the returned `solution.userAgent` along with the token. The legacy `workerIp` output contains the provider's `ip`, which the API defines as the submission IP. `solveTime` is the difference between actual `endTime` and `createTime`; missing facts are omitted rather than fabricated. All tools include the full provider response as `raw`.

[createTask](https://2captcha.com/api-docs/create-task) accepts worker languages `en` and `ru`; the old `rn` input is retained as an alias for `ru`. Worker language applies to image and text tasks. Optional empty strings and omitted fields retain their previous request omission behavior.

[reCAPTCHA V2 Enterprise](https://2captcha.com/api-docs/recaptcha-v2-enterprise) uses `RecaptchaV2EnterpriseTaskProxyless` or `RecaptchaV2EnterpriseTask`; set `isEnterprise: true` on the guided tool. `enterprisePayload` carries render parameters. Standard V2 remains unchanged.

[reCAPTCHA V3](https://2captcha.com/api-docs/recaptcha-v3) uses `RecaptchaV3TaskProxyless`, with documented `minScore` values 0.3, 0.7, or 0.9. [Proxies are explicitly unsupported](https://2captcha.com/api-docs/proxy) for both standard and Enterprise V3. A supplied proxy is rejected before submission.

[GeeTest](https://2captcha.com/api-docs/geetest) V3 uses `gt` and a fresh `challenge`. V4 uses `version: 4` and `initParameters.captcha_id`. The optional `geetestRiskType` maps to the documented `riskType` field. Existing legacy fields are retained.

[Image recognition](https://2captcha.com/api-docs/normal-captcha) supports numeric modes 0 through 4, including mode 4 for both numbers and letters. [Text questions](https://2captcha.com/api-docs/text) use `TextCaptchaTask.comment`.

The hCaptcha branch is retained without altered request fields. Its former official documentation URL was inaccessible during this refresh and the current API index does not list it, so current availability is unverified. This absence is not treated as evidence of retirement.

[Callbacks](https://2captcha.com/api-docs/callback) are forwarded to the provider; this integration does not register or receive webhook events. Consult the provider's current callback format and registration requirements.

Documentation review and offline verification do not establish live acceptance or solving performance. No provider calls or paid solves were performed during this refresh.
