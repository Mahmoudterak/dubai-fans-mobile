export interface PortalServiceResponse {
  id: number;
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  icon?: string | null;
  category?: string | null;
  isActive?: boolean;
  packages?: PortalPackageResponse[];
}

export interface PortalPackageResponse {
  id: number;
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  price?: string | number;
  billingType?: 'one_time' | 'monthly' | 'yearly';
  features?: unknown;
  isActive?: boolean;
}

export interface MobilePackage {
  id: number;
  name: string;
  price: string;
  billingCycle: 'one_time' | 'monthly' | 'yearly';
  description: string | null;
  features: string[];
  isActive: boolean;
}

export interface MobileService {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  packages: MobilePackage[];
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function normalizePackage(raw: PortalPackageResponse): MobilePackage {
  return {
    id: raw.id,
    name: asText(raw.nameAr) ?? asText(raw.nameEn) ?? '',
    price: String(raw.price ?? '0.00'),
    billingCycle: raw.billingType ?? 'one_time',
    description: asText(raw.descriptionAr) ?? asText(raw.descriptionEn),
    features: Array.isArray(raw.features)
      ? raw.features.filter((feature): feature is string => typeof feature === 'string')
      : [],
    isActive: raw.isActive !== false,
  };
}

export function normalizePortalService(raw: PortalServiceResponse): MobileService {
  return {
    id: raw.id,
    name: asText(raw.nameAr) ?? asText(raw.nameEn) ?? '',
    slug: asText(raw.category) ?? 'general',
    icon: asText(raw.icon),
    description: asText(raw.descriptionAr) ?? asText(raw.descriptionEn),
    isActive: raw.isActive !== false,
    packages: Array.isArray(raw.packages) ? raw.packages.map(normalizePackage) : [],
  };
}