export interface User {
  uuid: string;
  email: string;
  name: string;
  lastname: string;
  roleId: string;
  departmentId: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  lastname: string;
  roleId: string;
  departmentId: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  lastname?: string;
  roleId?: string;
  departmentId?: string;
}
