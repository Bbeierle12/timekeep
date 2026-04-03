declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        type: 'ADMIN' | 'EMPLOYEE';
        role?: string;
      };
      token?: string;
      requestId?: string;
    }
  }
}

export {};
