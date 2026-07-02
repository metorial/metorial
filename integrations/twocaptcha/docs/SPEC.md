# Slates Specification for Twocaptcha

## Overview

2Captcha is a human-powered image and CAPTCHA recognition service whose main purpose is solving CAPTCHAs in a quick and accurate way by human employees, but the service is not limited only to CAPTCHA solving. You can convert to text any image that a human can recognize. Most captcha tasks are solved automatically by AI models for speed, and if AI confidence is low, the task is passed to verified human workers.

## Authentication

2Captcha uses API key authentication.

- To use the API you need to obtain your API key from the Dashboard. The key is used to authenticate all your requests to the API endpoints.
- Each user is given a unique authentication token called an API key. It's a 32-character string that looks like: `1abc234de56fab7c89012d34e56fa7b8`.
- The API key can be found at `https://2captcha.com/setting` after registering an account.
- **API v2 (JSON-based):** Pass the key as the `clientKey` field in the JSON request body to `https://api.2captcha.com/createTask`.
- **API v1 (legacy):** Pass the key as the `key` parameter in requests to `https://2captcha.com/in.php` and `https://2captcha.com/res.php`.

No OAuth or scopes are involved. The single API key grants full access to all captcha solving and account management features.

## Features

### Captcha Solving

The core feature of 2Captcha. You submit a captcha task and receive a solution (typically a token or text answer). The workflow involves sending your captcha to the server, getting a task ID, polling until the task is completed, and getting the result. Supported captcha types include:

- **Interactive/Token-based captchas:** reCAPTCHA V2, reCAPTCHA V3, reCAPTCHA V2/V3 Enterprise, Arkose Labs (FunCaptcha), GeeTest (v3 and v4), Cloudflare Turnstile, Capy Puzzle, KeyCAPTCHA, Lemin, Amazon WAF, CyberSiARA, MTCaptcha, Cutcaptcha, Friendly Captcha, DataDome, atbCAPTCHA, Tencent, Prosopo Procaptcha, CaptchaFox, VK Captcha, Temu Captcha, and Altcha Captcha.
- **Simple/Image-based captchas:** Normal image captcha (distorted text), text captcha, rotate captcha, coordinate/click captcha, grid captcha, canvas (draw around), bounding box, and audio captcha.

Key parameters vary by captcha type but commonly include the site key, page URL, and optionally a proxy configuration for IP-matching requirements. For reCAPTCHA V3, a minimum score and page action can be specified. Image captchas accept base64-encoded images or file uploads.

### Proxy Support

You can provide your own proxy details (address, port, credentials, type) when submitting captcha tasks. This is important for cases where the captcha solution must originate from a specific IP, such as Google services.

### Image-to-Text Recognition

Beyond CAPTCHA solving, you can convert to text any image that a human can recognize. Options include case sensitivity, language hints, and numeric-only constraints.

### Solution Reporting

You can report captcha solutions as correct or incorrect. This helps improve quality and may result in refunds for incorrectly solved captchas.

### Account Balance

You can check your current account balance via the API.

### Residential Proxy Service

2Captcha also provides residential and rotating proxy services with a separate API. Through this API you can:

- Retrieve account status and traffic usage.
- Check proxy balance.
- Browse available proxy locations by country, region, city, and ASN (autonomous system/ISP).

## Events

2Captcha provides a callback (webhook) option that allows you to get the solution for your captcha automatically when it's ready, without polling the API.

### Captcha Solution Ready

- When a captcha is solved, 2Captcha sends an HTTP POST request with URL-encoded form data to your registered callback URL. The request contains two parameters: `id` (captcha ID) and `code` (the answer).
- The callback URL must first be registered in the pingback settings of your 2Captcha account. You register a domain or IP, not a full URL.
- The callback URL can also be specified per-request when creating a task.
