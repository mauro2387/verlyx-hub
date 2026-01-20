export class Company {
  id: string;
  ownerUserId: string;
  name: string;
  type?: string;
  description?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
