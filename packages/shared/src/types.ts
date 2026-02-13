// Shared TypeScript types

export enum UserRole {
  Admin = 'Admin',
  PM = 'PM',
  FieldTech = 'FieldTech',
  Office = 'Office',
  ClientViewer = 'ClientViewer',
}

export enum AiStatus {
  pending = 'pending',
  processing = 'processing',
  complete = 'complete',
  failed = 'failed',
}

export enum IssueSeverity {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical',
}

export interface DetectedIssue {
  type: string;
  severity: IssueSeverity;
  confidence: number;
  description: string;
}

export interface Photo {
  id: string;
  s3Key: string;
  s3Url: string;
  buildingId: string;
  projectId: string;
  folderId?: string;
  uploadedById: string;
  geoLat?: number;
  geoLng?: number;
  capturedAt?: Date;
  uploadedAt: Date;
  aiProcessed: boolean;
  aiStatus: AiStatus;
}

export interface AiAnnotation {
  id: string;
  photoId: string;
  shortDescription: string;
  fullDescription: string;
  tags: string[];
  categories: string[];
  detectedIssues: DetectedIssue[];
  severityScore: number;
  confidenceScore: number;
  estimatedRepairPriority: string;
  structuralImpactScore: number;
  modelUsed: string;
  version: number;
  createdAt: Date;
}
