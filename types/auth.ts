export type Wallet = {
  name: string;
  balance: {
    /** Il backend la manda come stringa (es. "0"), non come numero. */
    amount: string;
    currency: string;
    decimal_places: number;
  };
  slug: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  username: string;
  created_at?: string;
  updated_at?: string;
  is_tenant?: boolean;
  /** Presente solo dopo /me - il register non lo restituisce. */
  wallets?: Wallet[];
};

/** Risposta di POST /register: include l'utente, ma niente wallet. */
export type RegisterResponse = {
  success: "success";
  token: string;
  user: User;
};

/** Risposta di POST /login: solo il token, l'utente si prende da GET /me. */
export type LoginResponse = {
  success: "success";
  token: string;
};

export type MeResponse = {
  user: User;
  wallets: Wallet[];
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  username: string;
  email: string;
  password: string;
};
