import crypto from "node:crypto";

type EncryptedPayloadV1 = {
  v: 1;
  iv: string; // base64
  tag: string; // base64
  data: string; // base64
};

function getKey() {
  const secret =
    process.env.SERVER_KEY_ENC_SECRET ||
    process.env.JWT_SECRET ||
    "dev-insecure-secret";
  return crypto.createHash("sha256").update(secret).digest(); // 32 bytes
}

export function encryptString(plaintext: string) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayloadV1 = {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
  return JSON.stringify(payload);
}

export function decryptString(payload: string) {
  // Backwards compatibility if plaintext somehow exists
  if (!payload?.trim()?.startsWith("{")) return payload;

  const parsed = JSON.parse(payload) as Partial<EncryptedPayloadV1>;
  if (parsed.v !== 1 || !parsed.iv || !parsed.tag || !parsed.data) {
    throw new Error("Invalid encrypted payload");
  }

  const key = getKey();
  const iv = Buffer.from(parsed.iv, "base64");
  const tag = Buffer.from(parsed.tag, "base64");
  const data = Buffer.from(parsed.data, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

