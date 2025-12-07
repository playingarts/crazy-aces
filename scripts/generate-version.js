#!/usr/bin/env node

/**
 * Generate version.json with git commit info
 * Runs automatically during build
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getGitInfo() {
    // Try Vercel environment variables first (available during build on Vercel)
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
        const fullHash = process.env.VERCEL_GIT_COMMIT_SHA;
        const shortHash = fullHash.substring(0, 7);

        return {
            version: shortHash,
            fullHash: fullHash,
            date: new Date().toISOString().split('T')[0],
            branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
            timestamp: new Date().toISOString()
        };
    }

    // Try local git commands (for local builds)
    try {
        const hash = execSync('git rev-parse --short HEAD').toString().trim();
        const date = execSync('git log -1 --format=%cd --date=short').toString().trim();
        const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

        return {
            version: `${hash}`,
            fullHash: execSync('git rev-parse HEAD').toString().trim(),
            date,
            branch,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.warn('Git info not available, using fallback version');
        return {
            version: 'dev',
            fullHash: 'unknown',
            date: new Date().toISOString().split('T')[0],
            branch: 'unknown',
            timestamp: new Date().toISOString()
        };
    }
}

const versionInfo = getGitInfo();
const versionPath = join(__dirname, '..', 'public', 'version.json');

writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));

console.log(`✅ Generated version: ${versionInfo.version} (${versionInfo.date})`);
