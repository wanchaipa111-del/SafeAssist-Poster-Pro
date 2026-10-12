import { Property } from '../types';

export function buildCaptionText(p: Property): string {
  const deal = (p.dealType || 'ขาย').toUpperCase();
  return `🔥 [${deal}] ${p.title} 🔥\n\n` +
    `💰 ราคา: ${p.price || '-'}\n` +
    `📍 ทำเล: ${p.location || '-'}\n` +
    `📐 ขนาดพื้นที่: ${p.size || '-'}\n` +
    `🚪 รายละเอียด: ${p.details || '-'}\n\n` +
    `✨ รายละเอียดเพิ่มเติม:\n${p.description || '-'}\n\n` +
    `📞 ข้อมูลติดต่อ:\n${p.contact || '-'}\n\n` +
    `#อสังหาริมทรัพย์ #${p.type} #${p.dealType} #ฝากขายเช่าอสังหา`;
}
