# 2Captcha

Submit CAPTCHA and image recognition tasks to the 2Captcha API v2, retrieve results, report solution accuracy, and check the account balance. The guided tools cover reCAPTCHA V2/V3, Arkose Labs, GeeTest, Turnstile, images, and text questions. The existing hCaptcha branch remains available for compatibility; its current provider documentation could not be verified. `create_task` accepts the exact documented task object for other task types, including audio and image coordinates.

Authenticate with the API key from [account settings](https://2captcha.com/setting). Task submissions may incur charges. Tools return the actual provider task ID without waiting or automatically resubmitting; call `get_task_result` with that ID and wait at least five seconds between checks. If submission fails before an ID is returned, check the callback or account before submitting again to avoid duplicate charges.

reCAPTCHA V3 does not support proxies. reCAPTCHA V2 Enterprise uses `isEnterprise: true`, with optional `enterprisePayload`. GeeTest V4 uses `geetestVersion: 4` and `initParameters` containing `captcha_id`; `gt` and `challenge` belong to V3. The legacy Russian worker value `rn` remains accepted and maps to the documented `ru` value.

See the [API documentation](https://2captcha.com/api-docs) and [integration reference](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
