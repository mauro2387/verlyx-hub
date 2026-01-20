export interface MyCompany {
  id: string;
  ownerUserId: string;
  name: string;
  type: string;
  description?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  
  // Business info
  taxId?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country: string;
  
  settings: Record<string, any>;
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}
