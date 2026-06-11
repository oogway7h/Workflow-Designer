export interface Document {
  uuid: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedByUserId: string;
  uploaderName: string;
  policyId?: string;
  customerId?: string;
  createdAt: string;
  downloadUrl?: string;
  requirementName?: string;
}

export interface DocumentAudit {
  uuid: string;
  documentName: string;
  userName: string;
  action: 'UPLOAD' | 'DOWNLOAD' | 'VIEW' | 'DELETE' | 'UPDATE';
  details: string;
  timestamp: string;
}

export interface DocumentUploadResponse {
  uuid: string;
  fileName: string;
  message: string;
  requirementName?: string;
}
