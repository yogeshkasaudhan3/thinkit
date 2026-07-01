// Augment Express.User to match the users DB row
declare global {
  namespace Express {
    interface User {
      id: number;
      googleId: string;
      email: string;
      name: string;
      picture?: string | null;
      phone?: string | null;
      profileComplete: boolean;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

export {};
