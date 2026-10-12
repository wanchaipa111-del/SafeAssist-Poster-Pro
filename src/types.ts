export type PropertyType = 'คอนโด' | 'บ้านเดี่ยว' | 'ทาวน์โฮม' | 'ที่ดิน' | 'อาคารพาณิชย์';
export type DealType = 'ขาย' | 'ให้เช่า' | 'ขาย/เช่า' | 'ขายพร้อมผู้เช่า';
export type GroupCategory = 'คอนโด' | 'บ้านเดี่ยว/ทาวน์โฮม' | 'ทั่วไป/ซื้อขายอสังหา' | 'ทำเลเฉพาะ';

export interface Property {
  id: string;
  code: string;
  title: string;
  type: PropertyType;
  dealType: DealType;
  price: string;
  location: string;
  size: string;
  details: string;
  contact: string;
  ownerContact?: string;
  sourceUrl?: string;
  imgFolderPath: string;
  imgUrl: string;
  description: string;
}

export interface FBGroup {
  id: string;
  name: string;
  url: string;
  category: GroupCategory;
  note: string;
  active: boolean;
}

export interface PostingHistory {
  id: string;
  timestamp: string;
  propId: string;
  propTitle: string;
  groupId: string;
  groupName: string;
  posterName: string;
  postedLink: string;
  status: string;
}

export interface Settings {
  agentName: string;
  phone: string;
  lineId: string;
  fbPage: string;
  folderPath: string;
}

export interface AppState {
  properties: Property[];
  groups: FBGroup[];
  history: PostingHistory[];
  settings: Settings;
}

export type TabType = 'properties' | 'groups' | 'poster' | 'history' | 'settings';
export type PropViewMode = 'grid' | 'list';
