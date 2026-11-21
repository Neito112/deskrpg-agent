const crypto = require('crypto');
const Database = require('better-sqlite3');
const db = new Database('data/deskrpg.db');

const DEV_JWT_SECRET = "dev-jwt-secret-do-not-use-in-production";

function getGatewayCipherKey() {
  const secret = process.env.INTERNAL_RPC_SECRET || process.env.JWT_SECRET || DEV_JWT_SECRET;
  return crypto.createHash("sha256").update(secret).digest();
}

function decryptGatewayToken(payload) {
  if (!payload) return "";
  const [version, ivB64, tagB64, encryptedB64] = payload.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !encryptedB64) {
    return payload;
  }
  const primaryKey = getGatewayCipherKey();
  const fallbackSources = [
    DEV_JWT_SECRET,
    process.env.INTERNAL_RPC_SECRET,
    process.env.JWT_SECRET,
    "change-me-to-a-random-64-char-string",
  ].filter((s) => typeof s === "string" && s.length > 0);

  const keysToTry = [
    primaryKey,
    ...fallbackSources.map((s) => crypto.createHash("sha256").update(s).digest()),
  ];

  let lastError;
  for (const key of keysToTry) {
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(ivB64, "base64url")
      );
      decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedB64, "base64url")),
        decipher.final(),
      ]);
      return decrypted.toString("utf8");
    } catch (err) {
      lastError = err;
    }
  }
  return "";
}

console.log('--- GATEWAYS ---');
const gateways = db.prepare('SELECT id, display_name, base_url, token_encrypted FROM gateway_resources').all();
for (const g of gateways) {
  console.log(g.display_name, 'Decrypted token:', decryptGatewayToken(g.token_encrypted));
}

console.log('--- PROFILES ---');
const profiles = db.prepare('SELECT id, profile_name, display_name, token_encrypted FROM hermes_profiles').all();
for (const p of profiles) {
  console.log(p.profile_name, 'Decrypted token:', decryptGatewayToken(p.token_encrypted));
}
