Now I have enough information to write the specification.

# Slates Specification for Minerstat

## Overview

Minerstat is a cryptocurrency mining monitoring and management platform for GPU and ASIC mining operations. It provides tools for remote worker management, real-time hardware monitoring, profitability tracking, and access to reference data on coins, mining hardware, and mining pools.

## Authentication

Minerstat uses two separate authentication mechanisms depending on which API surface you use:

### 1. Developer API Key (for Coins, Hardware, and Pools APIs)

The service requires an authenticated developer account and a valid subscription. Register in the Developer Portal, verify your email, choose a plan, and generate an API key before making requests.

- Include your API key with every request using the `X-API-Key` header or `?key=` query parameter while testing.
- Requests made without a valid key are rejected with HTTP 401.
- The API key is issued in the Developer Portal. Keys are tied to your subscription quota.

**Example:**

```
curl "https://api.minerstat.com/v2/coins" -H "X-API-Key: YOUR_KEY"
```

### 2. Bearer Token (for Private/Management API)

You must obtain your API token from the minerstat dashboard. Every API call must contain your token in the Authorization header, e.g., `Authorization: Bearer YOUR-API-TOKEN`.

- Additionally, you can whitelist multiple IPs from which commands can be executed. You can do this from your minerstat dashboard API page.
- This API is available to paying customers only.

### 3. Access Key (for Public/Monitoring API)

In all public API endpoints you need to authorize with your access key. Some endpoints also require other parameters, such as worker's name, timezone, or group's name. To use the public API, you don't need any special developer account.

- The access key is passed directly in the URL path: `https://api.minerstat.com/v2/stats/{ACCESS_KEY}/{WORKER_NAME}`
- Any registered account can use the public API, but with a paying account or minerstat+ there is more historical data available.

## Features

### Coin Data & Profitability

The Coins API surfaces market and profitability metrics for every coin in the minerstat dataset. Data includes ticker, algorithm, network hashrate, price, 24h volume, mining difficulty, estimated rewards, and block rewards. Results can be filtered by coin ticker or algorithm.

- Filter by comma-separated tickers (e.g., `?list=BTC,BCH,BSV`) or algorithms (e.g., `?algo=SHA-256,Scrypt`).

### Mining Hardware Database

The Hardware API delivers hashrate, power consumption, and specification data for GPUs and ASIC devices in the catalogue. Data includes device name, brand, type, supported algorithms with hashrate benchmarks, power draw, and technical specs (clock speeds, memory, etc.).

- Filter by hardware category (`?type=gpu` or `?type=asic`) or by manufacturer/brand (`?brand=antminer`).

### Mining Pools Directory

The Pools API provides curated information about mining pools, supported coins, fees, and payout thresholds.

### Worker Monitoring (Public API)

The monitoring API allows you to monitor workers' real-time data, such as hashrate and hardware data, and historical data about mining, profitability, and balance on pools and wallets.

Available data includes:

- List of all workers with hashrate, hardware details, temperature, fans, power consumption, estimated earnings, accepted and rejected shares, and basic system information.
- Historical information on hashrates, temperatures, fans, and power consumptions. Historical information on estimated earnings, temperatures, fans, power consumption, and efficiency.
- Worker activity logs for the last 3 days, group statistics, global statistics, 24h logs, and balance statistics for monitored pools and wallets.

### Worker Management (Private API)

The private API allows you to execute basic and some advanced commands independently of the minerstat dashboard.

- **Workers:** Creating, updating, deleting, and getting system information for your workers and customers' workers.
- **Remote commands:** Execute commands including shutdown, reboot, restart, stop, start, and exec.
- **Configuration:** Update worker settings including name, IP, mining client, config, ClockTune profiles, profit switching, electricity price, and power consumption.
- **Group management:** Add or remove workers from groups.
- **Tags:** Creating, updating, deleting, and getting information about tags on your account and your customers' accounts.
- **Customers:** Creating, updating, deleting, and getting system information of your customers.
- **ClockTune:** Manage GPU overclocking profiles (create, update, delete, retrieve).

## Events

Minerstat supports webhook-based event notifications through its **Triggers** system, configured via the dashboard. A webhook trigger is available for all possible events and calls a user-specified URL when conditions are met. Triggers are configured per worker group or account-wide.

The webhook URL supports dynamic tags: `(WORKER)` for the worker name, `(IF)` for the trigger condition, `(OF)` for the group name, and `(IS)` for the threshold value.

### Trigger Event Categories

- **GPU Temperature:** Fires when any GPU exceeds a configured temperature threshold (60°C–95°C). Checked every minute.
- **Worker Offline/Unresponsive:** Fires once the worker is unresponsive (offline) for a selected time. A webhook can be fired, which you can use in connection to your smart plugs.
- **Worker Idle:** Fires when the system is online but the mining client isn't mining.
- **Hashrate Drop:** Checked every 10 minutes; fires with a minimum 10-minute delay based on historical data. Configurable drop percentage.
- **Efficiency Drop:** Checked every 10 minutes and fires once there is an efficiency drop detected in last two entries.
- **Power/Consumption Drop:** Fires when power consumption drops by a configured percentage. Checked every 10 minutes.
- **GPU Count Mismatch:** Checked every 10 minutes and fires if the number of GPUs detected by the system is different than what you defined in the worker's config.
- **Rejected Shares:** Fires when rejected shares exceed a configured threshold. Checked every 10 minutes.
- **Config Errors:** Checked every 10 minutes and fires if the number of detected config errors in the last five minutes was higher or equal than the configured value.
- **Auth Errors:** Checked every 10 minutes and fires if the number of detected auth errors in the last five minutes was higher or equal than the configured value.
- **Driver Errors:** Fires when driver errors exceed a configured count within the last five minutes. Checked every 10 minutes.
- **GPU Errors:** Fires when GPU errors exceed a configured count within the last five minutes. Checked every 10 minutes.
- **Earnings Drop:** Fires on earnings drop; also supports a restart profit switch action.

Note: Triggers and webhooks are configured through the minerstat dashboard UI, not through the API. However, when preparing scripts for webhooks, you can use all actions and methods provided by the minerstat private and public API.
