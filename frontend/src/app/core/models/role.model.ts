export interface Role {
  uuid: string;
  roleName: string;
  permissions: string[];
}

export interface CreateRoleRequest {
  roleName: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  roleName: string;
  permissions: string[];
}
