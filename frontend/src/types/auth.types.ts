export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
