import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/**
 * Password hashing via Node's built-in scrypt — no dependency (CLAUDE.md
 * "default no to deps"). Async (libuv threadpool) so a login never blocks the
 * event loop.
 *
 * Format: `scrypt:<N>:<r>:<p>:<saltHex>:<hashHex>`. Cost parameters are encoded
 * in the string so they can be raised later WITHOUT invalidating existing
 * hashes (verify uses each hash's own params). argon2id is the future upgrade
 * if a native dependency is ever justified.
 */

// Manual promise wrapper: promisify(scrypt) drops the options overload in the
// Node types, so wrap it directly to keep the cost parameters typed.
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

const SALT_BYTES = 16;
const KEY_BYTES = 64;
// Current cost. N=2^17 meets OWASP's scrypt guidance (r=8, p=1). ~128MB working
// memory, so maxmem must exceed 128*N*r bytes.
const PARAMS = { N: 2 ** 17, r: 8, p: 1 } as const;
const MAXMEM = 256 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(password, salt, KEY_BYTES, {
    ...PARAMS,
    maxmem: MAXMEM,
  });
  return `scrypt:${PARAMS.N}:${PARAMS.r}:${PARAMS.p}:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  if (!saltHex || !hashHex) return false;

  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  // Bound the parsed cost so a corrupted/oversized stored value can't force
  // pathological work (defensive — hashes only ever come from hashPassword).
  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    N < 2 ** 14 ||
    N > 2 ** 20 ||
    r < 1 ||
    r > 32 ||
    p < 1 ||
    p > 16
  ) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;

  let derived: Buffer;
  try {
    derived = await scrypt(password, salt, KEY_BYTES, {
      N,
      r,
      p,
      maxmem: MAXMEM,
    });
  } catch {
    return false;
  }
  // Lengths are equal by construction, so timingSafeEqual is safe to call.
  return timingSafeEqual(derived, expected);
}

/**
 * A cached hash of a random string, used to run scrypt for logins where the
 * user doesn't exist (or has no password) so the response time matches the
 * real-user path — removes the timing oracle that would otherwise reveal which
 * emails have accounts.
 */
let dummyHashPromise: Promise<string> | null = null;
export function dummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(32).toString("hex"));
  return dummyHashPromise;
}
