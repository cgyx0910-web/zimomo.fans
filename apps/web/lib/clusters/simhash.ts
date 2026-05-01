const FNV64_OFFSET = BigInt("0xcbf29ce484222325");
const FNV64_PRIME = BigInt("0x100000001b3");
const MASK64 = BigInt("0xffffffffffffffff");

/** 默认 Hamming 阈值；可由 `CLUSTER_SIMHASH_THRESHOLD` 覆盖 */
export const SIMHASH_DISTANCE_THRESHOLD = 4;

export function readSimhashDistanceThreshold(): number {
  const raw = process.env.CLUSTER_SIMHASH_THRESHOLD?.trim();
  if (!raw) {
    return SIMHASH_DISTANCE_THRESHOLD;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n > 64) {
    return SIMHASH_DISTANCE_THRESHOLD;
  }
  return n;
}

function fnv1a64(input: string): bigint {
  let hash = FNV64_OFFSET;
  const buf = Buffer.from(input, "utf8");
  for (let i = 0; i < buf.length; i += 1) {
    hash ^= BigInt(buf[i]!);
    hash = (hash * FNV64_PRIME) & MASK64;
  }
  return hash;
}

function char4Grams(text: string): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 4) {
    return [];
  }
  const out: string[] = [];
  for (let i = 0; i <= t.length - 4; i += 1) {
    out.push(t.slice(i, i + 4));
  }
  return out;
}

/** 64 位 simhash；正文过短无法形成 4-gram 时返回 null */
export function computeSimhash64(text: string | null | undefined): bigint | null {
  if (!text?.trim()) {
    return null;
  }
  const slice = text.length > 8192 ? text.slice(0, 8192) : text;
  const grams = char4Grams(slice);
  if (grams.length === 0) {
    return null;
  }

  const votes = new Int32Array(64);
  const one = BigInt(1);
  for (const gram of grams) {
    const h = fnv1a64(gram);
    for (let bit = 0; bit < 64; bit += 1) {
      const b = (h >> BigInt(bit)) & one;
      votes[bit]! += b === one ? 1 : -1;
    }
  }

  let result = BigInt(0);
  for (let bit = 0; bit < 64; bit += 1) {
    if (votes[bit]! > 0) {
      result |= one << BigInt(bit);
    }
  }
  return result;
}

export function hammingDistance64(a: bigint, b: bigint): number {
  let x = a ^ b;
  let c = 0;
  const zero = BigInt(0);
  const one = BigInt(1);
  while (x !== zero) {
    x &= x - one;
    c += 1;
  }
  return c;
}
