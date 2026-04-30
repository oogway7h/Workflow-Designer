export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface DecodedToken {
  uuid: string;
  name: string;
  roleId: string;
  role: string;   // English internal role: EMPLOYEE, MANAGER, DESIGNER, ADMIN, CUSTOMER
  sub: string;
  iat?: number;
  exp?: number;
}

export interface UserInfo {
  uuid: string;
  name: string;
  email: string;
  roleId: string;
  role: string;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}
