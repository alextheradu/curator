import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      isSuperAdmin: boolean;
      defaultChatMode: "rookie" | "veteran";
      preferredName: string | null;
      teamNumber: number | null;
      onboardedAt: Date | null;
      tosAcceptedAt: Date | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    defaultChatMode?: "rookie" | "veteran";
    preferredName?: string | null;
    teamNumber?: number | null;
    onboardedAt?: Date | null;
    tosAcceptedAt?: Date | null;
    // Epoch ms of the last time the claims above were re-read from the
    // database; drives the periodic refresh in the jwt callback.
    settingsCheckedAt?: number;
  }
}
