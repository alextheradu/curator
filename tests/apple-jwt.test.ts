import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jwtVerifyMock = vi.fn();

vi.mock("jose", () => ({
  createRemoteJWKSet: () => "jwks-stub",
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
}));

describe("verifyAppleJwt", () => {
  const originalIosClientId = process.env.AUTH_APPLE_IOS_CLIENT_ID;
  const originalAndroidClientId = process.env.NEXT_PUBLIC_AUTH_APPLE_ANDROID_CLIENT_ID;

  beforeEach(() => {
    jwtVerifyMock.mockReset();
    jwtVerifyMock.mockResolvedValue({ payload: { sub: "user-123" } });
  });

  afterEach(() => {
    process.env.AUTH_APPLE_IOS_CLIENT_ID = originalIosClientId;
    process.env.NEXT_PUBLIC_AUTH_APPLE_ANDROID_CLIENT_ID = originalAndroidClientId;
  });

  it("verifies against both the iOS and Android Apple client IDs", async () => {
    process.env.AUTH_APPLE_IOS_CLIENT_ID = "com.alexradu.curatorai";
    process.env.NEXT_PUBLIC_AUTH_APPLE_ANDROID_CLIENT_ID = "com.alexradu.curatorai.android.signin";

    const { verifyAppleJwt } = await import("@/lib/apple-jwt");
    await verifyAppleJwt("token123");

    expect(jwtVerifyMock).toHaveBeenCalledWith(
      "token123",
      "jwks-stub",
      expect.objectContaining({
        audience: ["com.alexradu.curatorai", "com.alexradu.curatorai.android.signin"],
      })
    );
  });

  it("verifies with only the iOS audience when the Android client ID is unset", async () => {
    process.env.AUTH_APPLE_IOS_CLIENT_ID = "com.alexradu.curatorai";
    delete process.env.NEXT_PUBLIC_AUTH_APPLE_ANDROID_CLIENT_ID;

    const { verifyAppleJwt } = await import("@/lib/apple-jwt");
    await verifyAppleJwt("token123");

    expect(jwtVerifyMock).toHaveBeenCalledWith(
      "token123",
      "jwks-stub",
      expect.objectContaining({ audience: ["com.alexradu.curatorai"] })
    );
  });

  it("returns null without calling jwtVerify when no Apple client ID is configured", async () => {
    delete process.env.AUTH_APPLE_IOS_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_AUTH_APPLE_ANDROID_CLIENT_ID;

    const { verifyAppleJwt } = await import("@/lib/apple-jwt");
    const result = await verifyAppleJwt("token123");

    expect(result).toBeNull();
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });
});
