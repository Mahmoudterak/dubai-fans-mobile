import type { MobileService } from '@/constants/portalServices';
import { CONTACT } from '@/constants/config';

export type ServiceRequestKey = 'advertising' | 'social-growth' | 'website' | 'ecommerce' | 'seo';
export type ServiceCardAction = 'request' | 'contact' | 'external';

export interface ServiceRequestCard {
  key: string;
  title: string;
  eyebrow?: string;
  description: string;
  features: string[];
  icon: string;
  color: string;
  cta: string;
  action: ServiceCardAction;
  externalUrl?: string;
  services: MobileService[];
  isAvailable: boolean;
  startingPrice: string | null;
  recommendedPackageId: number | null;
}

type CardDefinition = Omit<ServiceRequestCard, 'services' | 'isAvailable' | 'startingPrice' | 'recommendedPackageId'>
  & { categories: string[]; alwaysAvailable?: boolean };

const CARD_DEFINITIONS: CardDefinition[] = [
  {
    key: 'advertising',
    title: 'إدارة الحملات المدفوعة',
    description: 'حملات Meta وGoogle وTikTok وSnapchat — استهداف دقيق وتحسين يومي لرفع جودة العملاء المحتملين.',
    features: ['Meta Ads', 'Google Ads', 'TikTok & Snapchat', 'تقارير أسبوعية'],
    icon: 'bullhorn-outline',
    color: '#FFF0F0',
    cta: 'اطلب إدارة حملاتك',
    action: 'request',
    categories: ['advertising'],
  },
  {
    key: 'seo',
    title: 'الظهور في Google / SEO',
    eyebrow: 'تحسين محركات البحث SEO',
    description: 'ظهور مستدام في Google — بحث كلمات مفتاحية، بناء روابط، تحسين تقني، ومحتوى SEO عربي.',
    features: ['بحث كلمات مفتاحية', 'SEO تقني وداخلي', 'بناء روابط خلفية', 'تقارير ترتيب'],
    icon: 'magnify',
    color: '#F0F8FF',
    cta: 'أحسّن ترتيبك الآن',
    action: 'request',
    categories: ['seo'],
  },
  {
    key: 'website',
    title: 'مواقع الشركات والأعمال',
    eyebrow: 'تطوير البرمجيات • مواقع الشركات والأعمال',
    description: 'موقع احترافي يعكس هويتك ويحوّل الزوار إلى عملاء — سريع، متجاوب، وسهل الإدارة.',
    features: ['تصميم احترافي', 'SEO جاهز', 'لوحة تحكم', 'SSL مجاني'],
    icon: 'web',
    color: '#F0FFF4',
    cta: 'اطلب موقعك',
    action: 'request',
    categories: ['website'],
  },
  {
    key: 'landing-page',
    title: 'صفحات الهبوط',
    eyebrow: 'تطوير البرمجيات',
    description: 'صفحة هبوط تحويلية لحملاتك الإعلانية — مُصمَّمة لرفع نسبة التحويل وتقليل تكلفة العميل.',
    features: ['A/B Testing جاهز', 'تحميل فائق السرعة', 'تكامل مع CRM', 'نموذج تواصل ذكي'],
    icon: 'page-layout-body',
    color: '#FFF8E7',
    cta: 'اطلب صفحة هبوط',
    action: 'external',
    externalUrl: CONTACT.whatsappUrl,
    categories: ['landing-page'],
  },
  {
    key: 'ecommerce',
    title: 'المتاجر الإلكترونية',
    eyebrow: 'تطوير البرمجيات',
    description: 'متجر إلكتروني متكامل بدفع آمن، إدارة مخزون، وشحن — جاهز للبيع من اليوم الأول.',
    features: ['بوابة دفع آمنة', 'إدارة المخزون', 'تتبع الطلبات', 'تكامل شحن'],
    icon: 'shopping-outline',
    color: '#F2F3FF',
    cta: 'ابدأ متجرك',
    action: 'request',
    categories: ['ecommerce'],
  },
  {
    key: 'erp-crm',
    title: 'أنظمة ERP وCRM',
    eyebrow: 'تطوير البرمجيات',
    description: 'حلول برمجية مخصصة لإدارة العمليات والعملاء — أتمتة كاملة تختصر الوقت وترفع الكفاءة.',
    features: ['إدارة المبيعات', 'تتبع الموظفين', 'لوحات تقارير', 'تكامل API'],
    icon: 'view-dashboard-outline',
    color: '#F3F8F5',
    cta: 'اطلب نظامك',
    action: 'external',
    externalUrl: CONTACT.whatsappUrl,
    categories: ['erp-crm'],
  },
  {
    key: 'custom-development',
    title: 'البرمجة المخصصة',
    eyebrow: 'تطوير البرمجيات',
    description: 'منصات وأنظمة ويب مخصصة بالكامل — API، لوحات تحكم، وحلول تقنية لأي متطلب تجاري.',
    features: ['Full-stack', 'REST API', 'لوحات إدارة', 'دعم تقني مستمر'],
    icon: 'code-tags',
    color: '#F4F0FF',
    cta: 'ناقش مشروعك',
    action: 'external',
    externalUrl: CONTACT.whatsappUrl,
    categories: ['custom-development'],
  },
  {
    key: 'website-templates',
    title: 'نماذج المواقع الجاهزة',
    description: 'استعرض نماذج جاهزة تساعدك على اختيار شكل موقعك قبل البدء.',
    features: [],
    icon: 'view-grid-outline',
    color: '#F4F4F4',
    cta: 'استعرض النماذج',
    action: 'external',
    externalUrl: 'https://mtuaefans.com/website-templates',
    categories: [],
    alwaysAvailable: true,
  },
  {
    key: 'social-growth',
    title: 'إدارة السوشيال ميديا',
    description: 'حضور احترافي ومستمر لعلامتك التجارية على السوشيال ميديا.',
    features: [],
    icon: 'account-group-outline',
    color: '#FFF0F8',
    cta: 'ابدأ الآن',
    action: 'request',
    categories: ['social'],
  },
];

export function getServiceRequestCards(services: MobileService[]): ServiceRequestCard[] {
  return CARD_DEFINITIONS.map((definition) => {
    const matched = definition.categories
      .map((category) => services.find((service) => service.slug === category && service.isActive))
      .filter((service): service is MobileService => Boolean(service));
    const { categories: _categories, alwaysAvailable = false, ...card } = definition;
    const packages = matched
      .flatMap((service) => service.packages)
      .filter((pkg) => pkg.isActive && Number.isFinite(Number(pkg.price)));
    const sortedPackages = [...packages].sort((left, right) => Number(left.price) - Number(right.price));

    return {
      ...card,
      services: matched,
      isAvailable: alwaysAvailable || matched.length > 0,
      startingPrice: sortedPackages[0]?.price ?? null,
      recommendedPackageId: null,
    };
  });
}

export function isServiceRequestKey(value: string): value is ServiceRequestKey {
  return ['advertising', 'social-growth', 'website', 'ecommerce', 'seo'].includes(value);
}

export function getServiceRequestCard(
  services: MobileService[],
  key: ServiceRequestKey,
): ServiceRequestCard | null {
  return getServiceRequestCards(services).find((card) => card.key === key) ?? null;
}