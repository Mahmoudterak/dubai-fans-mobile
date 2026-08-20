/**
 * Public app configuration.
 *
 * Google OAuth has been removed. Authentication is handled via
 * email/password only (POST /api/portal/auth/login and /auth/register).
 */

export const CONTACT = {
  whatsappNumber: '+971 54 286 1215',
  whatsappUrl: 'https://wa.me/971542861215',
  instagramHandle: '@mtuaefans',
  instagramUrl: 'https://www.instagram.com/mtuaefans',
  email: 'info@mtuaefans.com',
  websiteUrl: 'https://mtuaefans.com',
  websiteDisplayUrl: 'mtuaefans.com',
} as const;

export const BANK_TRANSFER = {
  accountName: 'Ismail Sabry Moham Elkharashy',
  swift: 'NBADAEAAXXX',
  iban: 'AE430352455001471444010',
  accountNumber: '2455001471444010',
  bank: 'FAB',
  branchAddress: 'P.O. Box 2993, Abu Dhabi',
} as const;

export const PROOF_STATS = [
  { value: '500+', title: 'مشروع منجز', description: 'موقع، متجر، وحملة إعلانية' },
  { value: '1,200+', title: 'عميل راضٍ', description: 'في الإمارات والخليج العربي' },
  { value: '12', title: 'دولة نخدمها', description: 'حضور عربي وعالمي متنامٍ' },
  { value: '98%', title: 'نسبة رضا العملاء', description: 'معدّل تجديد العقود سنوياً' },
] as const;
