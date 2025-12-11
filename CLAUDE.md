# Crazy Aces - Claude Instructions

## Deployment Rules (CRITICAL)

1. **ALWAYS deploy to Vercel after any code changes**: Run `vercel --prod` after modifying any files
2. **NEVER commit or push to git without user confirmation first**
3. **NEVER deploy without user confirmation first**
4. When user says "deploy" - run `vercel --prod`

## Deployment Workflow

When making changes:
1. Make the code changes
2. Ask user for confirmation before committing/deploying
3. If approved: `git add . && git commit && git push && vercel --prod`

## Project Info

- Production URL: https://play.playingarts.com
- Email service: Resend (info@playingarts.com)
- Test email whitelist: korzinin@gmail.com (bypasses rate limit and claim check)

## Environment Variables

Located in Vercel. Key ones:
- EMAIL_FROM: Playing Arts <info@playingarts.com>
- RESEND_API_KEY
- DISCOUNT_CODE_5, DISCOUNT_CODE_10, DISCOUNT_CODE_15
- SESSION_SECRET
- KV_REST_API_REDIS_URL
