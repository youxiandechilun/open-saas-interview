const FORBIDDEN_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".home.arpa",
] as const;

export function isForbiddenProviderHostname(rawHostname: string): boolean {
  const hostname = normalizeHostname(rawHostname);
  if (!hostname) return true;

  const ipv4 = parseIpv4(hostname);
  if (ipv4) return !isPublicIpv4(ipv4);

  const ipv6 = parseIpv6(hostname);
  if (ipv6) return !isPublicIpv6(ipv6);

  if (hostname === "localhost" || !hostname.includes(".")) return true;
  return FORBIDDEN_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
  );
}

export function isPublicNetworkAddress(rawAddress: string): boolean {
  const address = normalizeHostname(rawAddress.split("%")[0] ?? "");
  const ipv4 = parseIpv4(address);
  if (ipv4) return isPublicIpv4(ipv4);

  const ipv6 = parseIpv6(address);
  return ipv6 ? isPublicIpv6(ipv6) : false;
}

function normalizeHostname(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
}

function parseIpv4(value: string): [number, number, number, number] | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;

  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) return Number.NaN;
    return Number(part);
  });
  if (octets.some((octet) => !Number.isInteger(octet) || octet > 255)) {
    return null;
  }
  return octets as [number, number, number, number];
}

function isPublicIpv4([a, b, c]: [number, number, number, number]): boolean {
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && c === 0) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function parseIpv6(value: string): number[] | null {
  if (!value.includes(":")) return null;

  let normalized = value;
  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    const ipv4 = parseIpv4(normalized.slice(lastColon + 1));
    if (!ipv4) return null;
    const high = (ipv4[0] << 8) | ipv4[1];
    const low = (ipv4[2] << 8) | ipv4[3];
    normalized = `${normalized.slice(0, lastColon)}:${high.toString(
      16,
    )}:${low.toString(16)}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = parseIpv6Half(halves[0] ?? "");
  const right = parseIpv6Half(halves[1] ?? "");
  if (!left || !right) return null;

  if (halves.length === 1) return left.length === 8 ? left : null;
  const missing = 8 - left.length - right.length;
  if (missing < 1) return null;
  return [...left, ...Array<number>(missing).fill(0), ...right];
}

function parseIpv6Half(value: string): number[] | null {
  if (!value) return [];
  const parts = value.split(":");
  const groups = parts.map((part) =>
    /^[a-f\d]{1,4}$/i.test(part) ? Number.parseInt(part, 16) : Number.NaN,
  );
  return groups.some((group) => !Number.isInteger(group)) ? null : groups;
}

function isPublicIpv6(groups: number[]): boolean {
  if (groups.length !== 8) return false;

  const [first = 0, second = 0, , , , sixth = 0, seventh = 0, eighth = 0] =
    groups;
  if (groups.slice(0, 5).every((group) => group === 0) && sixth === 0xffff) {
    return isPublicIpv4([
      seventh >> 8,
      seventh & 0xff,
      eighth >> 8,
      eighth & 0xff,
    ]);
  }

  // Only globally routable unicast space is accepted. This excludes loopback,
  // ULA, link-local, multicast, NAT64, and other special-purpose prefixes.
  if (first < 0x2000 || first > 0x3fff) return false;
  if (first === 0x2001 && second === 0x0000) return false; // Teredo.
  if (first === 0x2001 && second === 0x0002) return false; // Benchmarking.
  if (first === 0x2001 && second >= 0x0010 && second <= 0x002f) return false;
  if (first === 0x2001 && second === 0x0db8) return false; // Documentation.
  if (first === 0x2002) return false; // 6to4 can embed private IPv4 targets.
  if (first === 0x3fff) return false; // Documentation prefix.
  return true;
}
