import { z } from 'zod';

// Cheque image reference
export const ChequeImageRefSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
  sizeBytes: z.number(),
  hash: z.string(), // sha256
  url: z.string().optional(), // signed URL (mock/dev only)
});

export type ChequeImageRef = z.infer<typeof ChequeImageRefSchema>;

// Individual cheque item
export const ChequeItemSchema = z.object({
  id: z.string(),
  chequeNumber: z.string().optional(),
  amountAED: z.number().optional(),
  issuerName: z.string().optional(), // drawer
  bankName: z.string().optional(),
  date: z.string().optional(), // ISO
  landlordId: z.string(),
  propertyId: z.string(),
  images: z.array(ChequeImageRefSchema),
  notes: z.string().optional(),
});

export type ChequeItem = z.infer<typeof ChequeItemSchema>;

// Pickup details
export const PickupDetailsSchema = z.object({
  contactName: z.string().min(1),
  contactPhone: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  emirate: z.string().optional(),
  preferredWindow: z.object({
    start: z.string(), // ISO
    end: z.string(), // ISO
  }).optional(),
  specialInstructions: z.string().optional(),
});

export type PickupDetails = z.infer<typeof PickupDetailsSchema>;

// Cheque collection request status
export const ChequeCollectionStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'SCHEDULED',
  'FAILED',
  'CANCELLED',
]);

export type ChequeCollectionStatus = z.infer<typeof ChequeCollectionStatusSchema>;

// Role types
export const ChequeRequesterRoleSchema = z.enum([
  'PROPERTY_MANAGER',
  'LANDLORD',
  'AGENT',
]);

export type ChequeRequesterRole = z.infer<typeof ChequeRequesterRoleSchema>;

// Main cheque collection request
export const ChequeCollectionRequestSchema = z.object({
  id: z.string(), // CHQ-REQ-xxxx
  role: ChequeRequesterRoleSchema,
  requesterUserId: z.string(),
  landlordIds: z.array(z.string()),
  propertyIds: z.array(z.string()),
  items: z.array(ChequeItemSchema),
  pickup: PickupDetailsSchema,
  status: ChequeCollectionStatusSchema,
  scheduledAt: z.string().optional(), // ISO datetime
  bankRef: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChequeCollectionRequest = z.infer<typeof ChequeCollectionRequestSchema>;

// Submit payload (to bank provider)
export const ChequeCollectionSubmitPayloadSchema = z.object({
  requestId: z.string(),
  pickup: PickupDetailsSchema,
  items: z.array(z.object({
    chequeNumber: z.string().optional(),
    amountAED: z.number().optional(),
    issuerName: z.string().optional(),
    bankName: z.string().optional(),
    date: z.string().optional(),
    landlordExternalId: z.string().optional(),
    propertyExternalId: z.string().optional(), // Houzez/WordPress id
    images: z.array(z.object({
      fileId: z.string(),
      hash: z.string(),
    })),
  })),
});

export type ChequeCollectionSubmitPayload = z.infer<typeof ChequeCollectionSubmitPayloadSchema>;

// Provider response
export const ChequeCollectionSubmitResponseSchema = z.object({
  bankRef: z.string(),
  scheduledAt: z.string(), // ISO datetime
});

export type ChequeCollectionSubmitResponse = z.infer<typeof ChequeCollectionSubmitResponseSchema>;

// API DTOs
export const CreateChequeRequestDTO = z.object({
  role: ChequeRequesterRoleSchema,
});

export const UpdateChequeRequestDTO = z.object({
  items: z.array(ChequeItemSchema).optional(),
  pickup: PickupDetailsSchema.optional(),
  notes: z.string().optional(),
});

export const UploadChequeImageDTO = z.object({
  file: z.any(), // File object
  requestId: z.string(),
  itemId: z.string().optional(),
});

export type CreateChequeRequestInput = z.infer<typeof CreateChequeRequestDTO>;
export type UpdateChequeRequestInput = z.infer<typeof UpdateChequeRequestDTO>;
