// PowerSync schema definition (placeholder for Phase 1)
// Real sync rules will be configured per phase as we add features

export interface PowerSyncConfig {
  powerSyncUrl: string;
  tokenSecret: string;
}

export function initPowerSyncClient(config: PowerSyncConfig) {
  // Placeholder: full initialization in Phase 1+
  return {
    url: config.powerSyncUrl,
    secret: config.tokenSecret,
  };
}
