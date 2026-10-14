import {
  APP_VERSION,
  APP_BUILD_CODE,
  OFFICIAL_WEBSITE_URL,
  UPDATE_ENDPOINTS,
  ALLOWED_UPDATE_DOMAINS,
} from '../config/version';

/**
 * Raw server payload structure as defined by the remote update API.
 * Supports both the standard schema and backward-compatible fields.
 */
export interface RemoteUpdatePayload {
  latestVersionCode?: number;
  latestVersionName?: string;
  apkDownloadUrl?: string;
  updateMessage?: string;
  forceUpdate?: boolean;

  // Backward compatibility fields
  versionCode?: number;
  version?: string;
  apkUrl?: string;
  websiteUrl?: string;
  mandatory?: boolean;
  minVersion?: string;
  releaseDate?: string;
  changelog?: string[];
  sha256?: string;
  fileSizeBytes?: number;
  fileSizeMB?: string;
}

/**
 * Normalized Update Information for the application UI and logic.
 */
export interface UpdateInfo {
  latestVersionCode: number;
  latestVersionName: string;
  apkDownloadUrl: string;
  updateMessage: string;
  forceUpdate: boolean;

  // Metadata
  releaseDate?: string;
  changelog?: string[];
  sha256?: string;
  fileSizeMB?: string;

  // Backward compatibility aliases
  version: string;
  versionCode: number;
  apkUrl: string;
  websiteUrl: string;
  mandatory: boolean;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  updateInfo: UpdateInfo | null;
  currentVersion: string;
  currentVersionCode: number;
  isMandatory: boolean;
  error?: string;
}

/**
 * Compare two semver strings (e.g. '2.5.1' vs '2.5.0').
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 == v2
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^[vV]/, '').trim();
  const clean2 = (v2 || '').replace(/^[vV]/, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length, 3);
  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Validates that a destination URL is strictly HTTPS and originates from
 * an authorized domain in ALLOWED_UPDATE_DOMAINS.
 */
export function isSafeUpdateUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed.startsWith('https://')) return false;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_UPDATE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

class UpdateService {
  private sessionDismissedVersionCode: number | null = null;
  private lastCheckTime: number = 0;
  private cachedResult: CheckUpdateResult | null = null;
  private isChecking: boolean = false;

  /**
   * Dismiss an optional update for the duration of the current app session.
   * The update dialog will not re-appear until the app restarts or a newer version is released.
   */
  dismissForSession(versionCode: number): void {
    this.sessionDismissedVersionCode = versionCode;
  }

  /**
   * Reset session dismissal flag (used for testing or explicit re-checks)
   */
  resetSessionDismissal(): void {
    this.sessionDismissedVersionCode = null;
  }

  /**
   * Synchronously retrieves any previously detected newer update stored in localStorage
   * or early prefetched during HTML page load.
   * Enables the app to render the update screen immediately (0ms) on cold start.
   */
  getCachedPendingUpdate(): UpdateInfo | null {
    try {
      // 1. Check early pre-fetched data from index.html (runs before React initializes)
      if (typeof window !== 'undefined' && (window as any).__CINEVAULT_EARLY_UPDATE_DATA) {
        const earlyData = (window as any).__CINEVAULT_EARLY_UPDATE_DATA;
        const normalized = this.normalizePayload(earlyData);
        if (normalized) {
          const codeIsNewer = normalized.latestVersionCode > APP_BUILD_CODE;
          const semverIsNewer = compareVersions(normalized.latestVersionName, APP_VERSION) > 0;
          if (codeIsNewer || semverIsNewer) {
            return normalized;
          }
        }
      }

      // 2. Check localStorage cache
      const raw = localStorage.getItem('cinevault_pending_update');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        const code = Number(data.latestVersionCode) || 0;
        const name = String(data.latestVersionName || '');
        const isNewer = code > APP_BUILD_CODE || compareVersions(name, APP_VERSION) > 0;
        if (isNewer) {
          return data as UpdateInfo;
        } else {
          localStorage.removeItem('cinevault_pending_update');
        }
      }
    } catch {}
    return null;
  }

  /**
   * Clears the cached update when the app has been successfully updated.
   */
  clearCachedUpdate(): void {
    try {
      localStorage.removeItem('cinevault_pending_update');
    } catch {}
  }

  /**
   * Check if a newer version is available from the configured remote endpoints.
   * @param force Bypass rate limiting and session dismissal (e.g. manual user tap).
   */
  async checkForUpdate(force = false): Promise<CheckUpdateResult> {
    // Prevent overlapping checks
    if (this.isChecking) {
      if (this.cachedResult) return this.cachedResult;
    }

    // Rate-limiting: return cached result if checked within the last 45 seconds (unless force = true)
    const now = Date.now();
    if (!force && this.cachedResult && now - this.lastCheckTime < 45000) {
      // If user dismissed this version during session, ensure hasUpdate is false
      if (
        !this.cachedResult.isMandatory &&
        this.sessionDismissedVersionCode === this.cachedResult.updateInfo?.latestVersionCode
      ) {
        return {
          ...this.cachedResult,
          hasUpdate: false,
        };
      }
      return this.cachedResult;
    }

    this.isChecking = true;
    let lastError = '';

    try {
      let normalized: UpdateInfo | null = null;

      // 1. Consume early prefetch promise from index.html if available (0ms network overlap)
      if (typeof window !== 'undefined' && (window as any).__CINEVAULT_EARLY_UPDATE_PROMISE) {
        try {
          const earlyRaw = await (window as any).__CINEVAULT_EARLY_UPDATE_PROMISE;
          delete (window as any).__CINEVAULT_EARLY_UPDATE_PROMISE;
          if (earlyRaw && typeof earlyRaw === 'object') {
            normalized = this.normalizePayload(earlyRaw);
          }
        } catch {}
      }

      // 2. Query endpoints in parallel with fastest-responder (Promise.any) if early prefetch wasn't used
      if (!normalized) {
        const fetchEndpoint = async (endpoint: string): Promise<UpdateInfo> => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);

          try {
            const cacheBuster = `?t=${Date.now()}`;
            const urlWithParam = endpoint.includes('?')
              ? `${endpoint}&t=${Date.now()}`
              : `${endpoint}${cacheBuster}`;

            const response = await fetch(urlWithParam, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
              },
              cache: 'no-store',
              signal: controller.signal,
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status} from ${endpoint}`);
            }

            const rawText = await response.text();
            const cleanText = rawText.replace(/^\uFEFF/, '').trim();
            if (!cleanText) {
              throw new Error('Empty response payload');
            }

            const data: RemoteUpdatePayload = JSON.parse(cleanText);
            const norm = this.normalizePayload(data);
            if (!norm) {
              throw new Error('Invalid update payload structure');
            }

            return norm;
          } finally {
            clearTimeout(timeoutId);
          }
        };

        try {
          normalized = await Promise.any(UPDATE_ENDPOINTS.map(fetchEndpoint));
        } catch (aggregateErr: any) {
          lastError = aggregateErr?.errors?.[0]?.message || 'All update endpoints unreachable';
        }
      }

      if (normalized) {
        // Version comparison:
        // 1. Primary check: compare latestVersionCode > APP_BUILD_CODE
        // 2. Secondary check: compare latestVersionName > APP_VERSION via semver
        const codeIsNewer = normalized.latestVersionCode > APP_BUILD_CODE;
        const semverIsNewer = compareVersions(normalized.latestVersionName, APP_VERSION) > 0;
        const hasNewerVersion = codeIsNewer || semverIsNewer;

        if (hasNewerVersion) {
          try {
            localStorage.setItem('cinevault_pending_update', JSON.stringify(normalized));
          } catch {}
        } else {
          try {
            localStorage.removeItem('cinevault_pending_update');
          } catch {}
        }

        const isMandatory = hasNewerVersion && normalized.forceUpdate;

        // If the update is optional and the user dismissed it in this session, don't nag
        const isDismissedThisSession =
          !isMandatory &&
          !force &&
          this.sessionDismissedVersionCode === normalized.latestVersionCode;

        const result: CheckUpdateResult = {
          hasUpdate: hasNewerVersion && !isDismissedThisSession,
          updateInfo: normalized,
          currentVersion: APP_VERSION,
          currentVersionCode: APP_BUILD_CODE,
          isMandatory,
        };

        this.lastCheckTime = Date.now();
        this.cachedResult = result;
        return result;
      }
    } finally {
      this.isChecking = false;
    }

    // Fail-safe: if all endpoints failed or returned errors, fail silently without breaking the app
    const fallbackResult: CheckUpdateResult = {
      hasUpdate: false,
      updateInfo: null,
      currentVersion: APP_VERSION,
      currentVersionCode: APP_BUILD_CODE,
      isMandatory: false,
      error: lastError,
    };
    return fallbackResult;
  }

  /**
   * Safely normalize and sanitize the server response payload.
   * Returns null if mandatory fields are missing or invalid.
   */
  private normalizePayload(data: RemoteUpdatePayload): UpdateInfo | null {
    if (!data || typeof data !== 'object') return null;

    // Extract Version Code
    const rawCode = data.latestVersionCode ?? data.versionCode;
    const parsedCode = typeof rawCode === 'number' ? rawCode : parseInt(String(rawCode), 10);
    const validCode = Number.isInteger(parsedCode) && parsedCode > 0 ? parsedCode : APP_BUILD_CODE;

    // Extract Version Name
    const rawName = data.latestVersionName ?? data.version;
    const validName = typeof rawName === 'string' && rawName.trim().length > 0
      ? rawName.trim()
      : '';

    if (!validName) return null;

    // Extract and validate Official Website URL (where users download the APK)
    const rawWebUrl = data.websiteUrl || OFFICIAL_WEBSITE_URL;
    let safeWebsiteUrl = OFFICIAL_WEBSITE_URL;
    if (typeof rawWebUrl === 'string' && rawWebUrl.trim().length > 0) {
      const candidateWeb = rawWebUrl.trim();
      if (isSafeUpdateUrl(candidateWeb)) {
        safeWebsiteUrl = candidateWeb;
      }
    }

    // Extract and validate APK Download URL
    const rawUrl = data.apkDownloadUrl ?? data.apkUrl ?? data.websiteUrl;
    let safeDownloadUrl = safeWebsiteUrl;
    if (typeof rawUrl === 'string' && rawUrl.trim().length > 0) {
      const candidateUrl = rawUrl.trim();
      if (isSafeUpdateUrl(candidateUrl)) {
        safeDownloadUrl = candidateUrl;
      }
    }

    // Extract Force Update flag
    const forceUpdate = Boolean(data.forceUpdate ?? data.mandatory ?? false);

    // Extract Update Message
    let updateMessage = (data.updateMessage || '').trim();
    if (!updateMessage) {
      if (Array.isArray(data.changelog) && data.changelog.length > 0) {
        updateMessage = data.changelog[0];
      } else {
        updateMessage = `Update The Apk To The Latest Version`;
      }
    }

    return {
      latestVersionCode: validCode,
      latestVersionName: validName,
      apkDownloadUrl: safeDownloadUrl,
      updateMessage,
      forceUpdate,
      releaseDate: data.releaseDate,
      changelog: Array.isArray(data.changelog) ? data.changelog : [],
      sha256: data.sha256,
      fileSizeMB: data.fileSizeMB,
      // Backward compatibility aliases
      version: validName,
      versionCode: validCode,
      apkUrl: safeDownloadUrl,
      websiteUrl: safeWebsiteUrl,
      mandatory: forceUpdate,
    };
  }

  /**
   * Opens the official APK download page or APK direct URL in the device's default web browser.
   * Does NOT silently download or install inside the app.
   */
  openUpdateUrl(targetUrl?: string): void {
    const candidate = targetUrl || OFFICIAL_WEBSITE_URL;
    const safeUrl = isSafeUpdateUrl(candidate) ? candidate : OFFICIAL_WEBSITE_URL;

    // 1. Android native bridge (bypasses all WebView navigation intercepts and launches default browser via Intent)
    try {
      const androidDevice = (window as any).AndroidDevice;
      if (androidDevice) {
        if (typeof androidDevice.openExternalUrl === 'function') {
          const success = androidDevice.openExternalUrl(safeUrl);
          if (success) return;
        } else if (typeof androidDevice.openExternalBrowser === 'function') {
          const success = androidDevice.openExternalBrowser(safeUrl);
          if (success) return;
        }
      }
    } catch {
      // Continue to web fallbacks
    }

    // 2. Programmatic anchor element click (works across desktop & mobile browsers)
    try {
      const link = document.createElement('a');
      link.href = safeUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          if (link.parentNode) link.parentNode.removeChild(link);
        } catch {}
      }, 500);
      return;
    } catch {
      // Continue to next fallback
    }

    // 3. In Capacitor / Cordova Android, window.open with '_system'
    try {
      const win = window.open(safeUrl, '_system', 'noopener,noreferrer');
      if (win) return;
    } catch {
      // Continue to location fallback
    }

    // 4. Final fallback: top-level location navigation
    try {
      window.location.href = safeUrl;
    } catch {}
  }

  /**
   * Backward-compatible alias for opening the update website.
   */
  openWebsite(customUrl?: string): void {
    this.openUpdateUrl(customUrl);
  }
}

export const updateService = new UpdateService();
