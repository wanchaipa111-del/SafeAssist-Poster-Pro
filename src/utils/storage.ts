import * as XLSX from 'xlsx';
import { AppState, FBGroup, PostingHistory, Property, Settings } from '../types';

export const SAMPLE_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    code: 'C-6601',
    title: 'คอนโด M Jatujak (เอ็ม จตุจักร) 1 Bed 32 ตร.ม. ใกล้ BTS หมอชิต',
    type: 'คอนโด',
    dealType: 'ขาย/เช่า',
    price: '3,850,000 บาท / เช่า 16,000 บาท',
    location: 'จตุจักร / BTS หมอชิต / MRT จตุจักร',
    size: '32 ตร.ม.',
    details: '1 ห้องนอน 1 ห้องน้ำ ชั้น 18 แต่งครบ',
    contact: 'โทร 081-234-5678 (คุณเอ) / Line: @myrealestate',
    ownerContact: 'คุณวิชัย (เจ้าของห้อง) โทร 080-111-2222',
    sourceUrl: 'https://www.facebook.com/groups/btsmrtcondo/posts/1015888899',
    imgFolderPath: 'C:\\RealEstate\\Properties\\Condo_MJatujak',
    imgUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80',
    description: 'คอนโดหรูพร้อมอยู่ วิวเมืองเปิดกว้าง เฟอร์นิเจอร์และเครื่องใช้ไฟฟ้าครบชุด ส่วนกลางระดับพรีเมียม สระว่ายน้ำ ฟิตเนส 2 ชั้น'
  }
];

export const SAMPLE_GROUPS: FBGroup[] = [
  { id: 'grp-1', name: 'ซื้อขายคอนโดติดรถไฟฟ้า BTS / MRT', url: 'https://www.facebook.com/groups/btsmrtcondo', category: 'คอนโด', note: 'สมาชิก 120k', active: true },
  { id: 'grp-2', name: 'กลุ่มซื้อ-ขาย-เช่า บ้านและที่ดิน กรุงเทพฯ และปริมณฑล', url: 'https://www.facebook.com/groups/bkkrealestate', category: 'ทั่วไป/ซื้อขายอสังหา', note: 'อนุมัติโพสต์ไว', active: true },
  { id: 'grp-3', name: 'ฝากขาย-เช่า คอนโด อสังหาฯ ทุกชนิด (เจ้าของขายเอง)', url: 'https://www.facebook.com/groups/ownercondothailand', category: 'คอนโด', note: 'ห้ามโพสต์สแปม', active: true },
  { id: 'grp-4', name: 'อสังหาริมทรัพย์ บางนา สมุทรปราการ ศรีนครินทร์', url: 'https://www.facebook.com/groups/bangnarealestate', category: 'ทำเลเฉพาะ', note: 'เน้นโซนตะวันออก', active: true }
];

export const DEFAULT_SETTINGS: Settings = {
  agentName: 'คุณเอ (Agent Pro)',
  phone: '081-234-5678',
  lineId: '@myrealestate',
  fbPage: 'fb.com/myrealestate',
  folderPath: 'C:\\Users\\Admin\\Pictures\\RealEstate'
};

const STORAGE_KEY = 'estate_poster_db';

export function loadAppState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        properties: Array.isArray(parsed.properties) && parsed.properties.length > 0 ? parsed.properties : SAMPLE_PROPERTIES,
        groups: Array.isArray(parsed.groups) && parsed.groups.length > 0 ? parsed.groups : SAMPLE_GROUPS,
        history: Array.isArray(parsed.history) ? parsed.history : [],
        settings: parsed.settings ? { ...DEFAULT_SETTINGS, ...parsed.settings } : DEFAULT_SETTINGS,
        license: parsed.license || { isActivated: false }
      };
    }
  } catch (err) {
    console.error('Error loading app state from storage:', err);
  }
  return {
    properties: SAMPLE_PROPERTIES,
    groups: SAMPLE_GROUPS,
    history: [],
    settings: DEFAULT_SETTINGS,
    license: { isActivated: false }
  };
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving app state to storage:', err);
  }
}

// Download Excel Template for Properties
export function downloadExcelTemplate(): void {
  const templateData = [
    {
      'รหัสทรัพย์': 'C-6601',
      'ชื่อโครงการ': 'คอนโด M Jatujak 1 Bed 32 ตร.ม. ใกล้ BTS หมอชิต',
      'ประเภทอสังหาฯ': 'คอนโด',
      'ประเภทธุรกรรม': 'ขาย/เช่า',
      'ราคา': '3,850,000 บาท / เช่า 16,000 บาท',
      'ทำเล': 'จตุจักร / BTS หมอชิต / MRT จตุจักร',
      'ขนาดพื้นที่': '32 ตร.ม.',
      'รายละเอียดห้อง': '1 ห้องนอน 1 ห้องน้ำ ชั้น 18 แต่งครบ',
      'ข้อมูลติดต่อ': 'โทร 081-234-5678 (คุณเอ) / Line: @myrealestate',
      'ติดต่อเจ้าของ': 'คุณวิชัย โทร 080-111-2222',
      'ลิ้งต้นทาง': 'https://www.facebook.com/groups/xxx/posts/12345',
      'Pathรูปภาพ': 'C:\\RealEstate\\Properties\\Condo_MJatujak',
      'URLรูป': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
      'รายละเอียดเพิ่มเติม': 'เฟอร์นิเจอร์และเครื่องใช้ไฟฟ้าครบชุด สระว่ายน้ำ ฟิตเนส 2 ชั้น'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Property_Template');
  XLSX.writeFile(workbook, 'Property_Import_Template.xlsx');
}

// Parse imported Excel file
export async function parsePropertiesExcel(file: File, defaultContact: string, defaultPath: string): Promise<Property[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

  const properties: Property[] = [];
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const code = row['รหัสทรัพย์'] || row['Code'] || row['code'] || `PROP-${Date.now().toString().slice(-4)}${i}`;
    const title = row['หัวข้อ'] || row['ชื่อโครงการ'] || row['หัวข้ออสังหาฯ'] || row['Title'] || row['title'] || '';
    const type = (row['ประเภท'] || row['ประเภทอสังหาฯ'] || row['Type'] || row['type'] || 'คอนโด') as Property['type'];
    const dealType = (row['ประเภทธุรกรรม'] || row['DealType'] || row['dealType'] || 'ขาย') as Property['dealType'];
    const price = row['ราคา'] || row['Price'] || row['price'] || '-';
    const location = row['ทำเล'] || row['สถานที่'] || row['Location'] || row['location'] || '';
    const size = row['ขนาดพื้นที่'] || row['ขนาด'] || row['Size'] || row['size'] || '';
    const details = row['รายละเอียดห้อง'] || row['รายละเอียด'] || row['Details'] || row['details'] || '';
    const contact = row['ข้อมูลติดต่อ'] || row['ติดต่อ'] || row['Contact'] || row['contact'] || defaultContact;
    const ownerContact = row['ติดต่อเจ้าของ'] || row['เจ้าของ'] || row['OwnerContact'] || row['ownerContact'] || '';
    const sourceUrl = row['ลิ้งต้นทาง'] || row['URLต้นทาง'] || row['SourceUrl'] || row['sourceUrl'] || '';
    const imgFolderPath = row['Pathรูปภาพ'] || row['Pathรูป'] || row['ImgFolderPath'] || row['imgFolderPath'] || defaultPath;
    const imgUrl = row['URLรูป'] || row['ImgUrl'] || row['imgUrl'] || '';
    const description = row['รายละเอียดเพิ่มเติม'] || row['จุดเด่น'] || row['Description'] || row['description'] || '';

    if (!title || String(title).trim() === '') continue;

    properties.push({
      id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code: String(code).trim(),
      title: String(title).trim(),
      type,
      dealType,
      price: String(price).trim(),
      location: String(location).trim(),
      size: String(size).trim(),
      details: String(details).trim(),
      contact: String(contact).trim(),
      ownerContact: String(ownerContact).trim(),
      sourceUrl: String(sourceUrl).trim(),
      imgFolderPath: String(imgFolderPath).trim(),
      imgUrl: String(imgUrl).trim(),
      description: String(description).trim()
    });
  }

  return properties;
}

// Export Posting History to Excel
export function exportHistoryExcel(history: PostingHistory[]): void {
  const exportData = history.map((item) => ({
    'วัน-เวลา': new Date(item.timestamp).toLocaleString('th-TH'),
    'รายการอสังหาฯ': item.propTitle,
    'กลุ่ม Facebook': item.groupName,
    'ผู้โพสต์': item.posterName,
    'Link Posted': item.postedLink,
    'สถานะ': item.status
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Posting_History');
  XLSX.writeFile(workbook, `Posting_History_${new Date().toISOString().split('T')[0]}.xlsx`);
}
