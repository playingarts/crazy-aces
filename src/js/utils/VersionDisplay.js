/**
 * Version Display Utility
 * Loads and displays the app version from version.json
 */

export class VersionDisplay {
    constructor() {
        this.versionElement = document.getElementById('versionText');
        this.loadVersion();
    }

    async loadVersion() {
        try {
            const response = await fetch('/version.json');
            if (!response.ok) {
                throw new Error('Version file not found');
            }

            const versionInfo = await response.json();
            this.displayVersion(versionInfo);
        } catch (error) {
            // Fallback to dev version if file not found
            this.displayFallbackVersion();
        }
    }

    displayVersion(versionInfo) {
        if (this.versionElement) {
            // Format: v1a2b3c4 (2024-12-07)
            this.versionElement.textContent = `v${versionInfo.version}`;
            this.versionElement.title = `Build: ${versionInfo.fullHash}\nDate: ${versionInfo.date}\nBranch: ${versionInfo.branch}`;
        }
    }

    displayFallbackVersion() {
        if (this.versionElement) {
            this.versionElement.textContent = 'v-dev';
            this.versionElement.title = 'Development build';
        }
    }
}
