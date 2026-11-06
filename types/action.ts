export type ActionResponse<T = void> =
  | {
      success: true;
      message?: string;
      data?: T;
    }
  | {
      success: false;
      error: string;
    };
