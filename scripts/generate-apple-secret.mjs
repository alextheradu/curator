/**
 * Generates the AUTH_APPLE_SECRET JWT required by Sign in with Apple.
 * Apple's client secrets expire after 6 months max — re-run this before expiry.
 *
 * Usage:
 *   node scripts/generate-apple-secret.mjs \
 *     --team-id TEAMID123 \
 *     --key-id KEYID12345 \
 *     --client-id com.curatorfrc.app.auth \
 *     --key-file /path/to/AuthKey_KEYID12345.p8
 *
 * Add the output to your .env as AUTH_APPLE_SECRET=...
 */

import { readFileSync } from "fs";
import { createSign } from "crypto";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
}

const teamId = flag("--team-id");
const keyId = flag("--key-id");
const clientId = flag("--client-id");
const keyFile = flag("--key-file");

if (!teamId || !keyId || !clientId || !keyFile) {
  console.error("Missing required flags. See usage at the top of this file.");
  process.exit(1);
}

const privateKey = readFileSync(keyFile, "utf8");
const now = Math.floor(Date.now() / 1000);
const exp = now + 15_552_000; // 180 days — Apple max is 6 months

const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId })).toString("base64url");
const payload = Buffer.from(
  JSON.stringify({ iss: teamId, iat: now, exp, aud: "https://appleid.apple.com", sub: clientId })
).toString("base64url");

const signingInput = `${header}.${payload}`;
const sign = createSign("SHA256");
sign.update(signingInput);
const signature = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }, "base64url");

console.log(`\nAUTH_APPLE_SECRET=${signingInput}.${signature}`);
console.log(`\nExpires: ${new Date(exp * 1000).toISOString()} — add a calendar reminder to rotate.`);
