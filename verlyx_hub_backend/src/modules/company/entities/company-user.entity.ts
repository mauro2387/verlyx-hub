export class CompanyUser {
  id: string;
  companyId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'OPERATIVE' | 'FINANCE' | 'MARKETING' | 'GUEST';
  permissions: Record<string, any>;
  isActive: boolean;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
