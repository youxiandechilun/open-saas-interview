import { lookup } from "node:dns/promises";
import {
  isForbiddenProviderHostname,
  isPublicNetworkAddress,
} from "../providerNetworkPolicy";
import { AiProviderConfigError } from "./providerEncryption";

type ProviderFetch = typeof globalThis.fetch;
type AddressResolver = (hostname: string) => Promise<readonly string[]>;

type ProviderNetworkDependencies = {
  fetch?: ProviderFetch;
  resolveAddresses?: AddressResolver;
};

export class AiProviderNetworkError extends AiProviderConfigError {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderNetworkError";
  }
}

export async function assertPublicHttpsProviderUrl(
  value: string | URL,
  resolveAddresses: AddressResolver = resolveProviderAddresses,
): Promise<void> {
  const url = value instanceof URL ? value : new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    isForbiddenProviderHostname(url.hostname)
  ) {
    throw new AiProviderNetworkError(
      "AI provider must use a public HTTPS endpoint",
    );
  }

  const hostname = stripIpv6Brackets(url.hostname);
  let addresses: readonly string[];
  try {
    addresses = await resolveAddresses(hostname);
  } catch {
    throw new AiProviderNetworkError(
      "AI provider host could not be resolved to a public address",
    );
  }
  if (
    addresses.length === 0 ||
    addresses.some(
      (address) =>
        !isPublicNetworkAddress(address) &&
        !isDevelopmentSyntheticDnsAddress(address),
    )
  ) {
    throw new AiProviderNetworkError(
      "AI provider host could not be resolved to a public address",
    );
  }
}

// WSL's mirrored development networking can resolve public hostnames through
// the RFC 2544 benchmarking range (198.18.0.0/15). It is a local proxy hop,
// not the provider's real destination. Keep production strict while allowing
// this development-only resolution so public providers remain configurable.
function isDevelopmentSyntheticDnsAddress(rawAddress: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const [first, second] = rawAddress.split(".").map(Number);
  return first === 198 && (second === 18 || second === 19);
}

export function createSafeProviderFetch(
  configuredBaseUrl: string,
  dependencies: ProviderNetworkDependencies = {},
): ProviderFetch {
  const expectedOrigin = new URL(configuredBaseUrl).origin;
  const fetchImpl = dependencies.fetch ?? globalThis.fetch;
  const resolveAddresses =
    dependencies.resolveAddresses ?? resolveProviderAddresses;

  return async (input, init) => {
    const requestUrl = getRequestUrl(input);
    if (
      requestUrl.origin !== expectedOrigin ||
      requestUrl.protocol !== "https:" ||
      requestUrl.username ||
      requestUrl.password
    ) {
      throw new AiProviderNetworkError(
        "AI provider request target does not match the configured endpoint",
      );
    }

    await assertPublicHttpsProviderUrl(requestUrl, resolveAddresses);
    const response = await fetchImpl(input, { ...init, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel().catch(() => undefined);
      throw new AiProviderNetworkError("AI provider redirects are not allowed");
    }
    return response;
  };
}

async function resolveProviderAddresses(
  hostname: string,
): Promise<readonly string[]> {
  if (isPublicNetworkAddress(hostname)) return [hostname];
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

function getRequestUrl(input: Parameters<ProviderFetch>[0]): URL {
  if (typeof input === "string") return new URL(input);
  if (input instanceof URL) return new URL(input.href);
  return new URL(input.url);
}

function stripIpv6Brackets(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "");
}
