function unsafeRandomHexDigit() {
  return Math.floor(Math.random() * 16).toString(16);
}

function uuidFromRandomValues(getRandomValues: (array: Uint8Array) => Uint8Array) {
  const bytes = getRandomValues(new Uint8Array(16));

  // RFC 4122 version 4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function uuidFromMathRandom() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replaceAll(/[xy]/g, (char) => {
    const nibble = Number.parseInt(unsafeRandomHexDigit(), 16);
    const value = char === "x" ? nibble : ((nibble & 0x3) | 0x8);
    return value.toString(16);
  });
}

export function randomUuid() {
  const cryptoObject = globalThis.crypto;

  if (typeof cryptoObject?.randomUUID === "function") {
    return cryptoObject.randomUUID();
  }

  if (typeof cryptoObject?.getRandomValues === "function") {
    return uuidFromRandomValues((array) => cryptoObject.getRandomValues(array));
  }

  return uuidFromMathRandom();
}
