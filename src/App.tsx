import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Property,
  FBGroup,
  PostingHistory,
  Settings,
  AppState,
  TabType,
  PropViewMode
} from './types';
import {
  loadAppState,
  saveAppState,
  downloadExcelTemplate,
  parsePropertiesExcel,
  exportHistoryExcel,
  DEFAULT_SETTINGS
} from './utils/storage';
import { buildCaptionText } from './utils/caption';
import { OfflineIndicator } from './components/OfflineIndicator';
import { UpgradeModal } from './components/UpgradeModal';
import { SellerKeygenModal } from './components/SellerKeygenModal';
import { Footer } from './components/Footer';
import { getOrCreateDeviceId, validateLicenseKey, TRIAL_MAX_PROPERTIES } from './utils/license';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function App() {
  // --- Global App State ---
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return true; // Default dark as requested in the HTML template
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  // --- License & Trial State ---
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const isActivated = Boolean(appState.license?.isActivated);
  const isTrialMode = !isActivated;
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);

  const handleActivateLicense = (key: string): boolean => {
    if (validateLicenseKey(key, deviceId)) {
      const updated: AppState = {
        ...appState,
        license: {
          isActivated: true,
          licenseKey: key.trim().toUpperCase(),
          activatedAt: new Date().toISOString()
        }
      };
      setAppState(updated);
      saveAppState(updated);
      showToast('🎉 ปลดล็อกเวอร์ชันเต็ม Lifetime VIP เรียบร้อยแล้ว! ใช้งานได้ไม่จำกัดตลอดชีพ', 'success');
      return true;
    }
    return false;
  };

  const handleResetTrial = () => {
    const updated: AppState = {
      ...appState,
      license: {
        isActivated: false,
        licenseKey: undefined,
        activatedAt: undefined
      }
    };
    setAppState(updated);
    saveAppState(updated);
    setIsUpgradeModalOpen(false);
    showToast('คืนค่ากลับเป็นเวอร์ชันทดลองใช้งาน (จำกัด 2 ทรัพย์) เรียบร้อยแล้ว', 'info');
  };

  // Sync state to local storage
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  // Sync theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      showToast(next ? 'สลับเป็นโหมดมืด (Dark Mode)' : 'สลับเป็นโหมดสว่าง (Light Mode)', 'info');
      return next;
    });
  };

  // Toast Helper
  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // --- TAB 1: PROPERTIES STATE & FILTERS ---
  const [propSearch, setPropSearch] = useState('');
  const [propFilterType, setPropFilterType] = useState('ALL');
  const [propViewMode, setPropViewMode] = useState<PropViewMode>(() => {
    return (localStorage.getItem('propViewMode') as PropViewMode) || 'grid';
  });

  const handleSetPropViewMode = (mode: PropViewMode) => {
    setPropViewMode(mode);
    localStorage.setItem('propViewMode', mode);
  };

  const filteredProperties = useMemo(() => {
    const s = propSearch.toLowerCase().trim();
    return appState.properties.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(s) ||
        (p.location && p.location.toLowerCase().includes(s)) ||
        (p.code && p.code.toLowerCase().includes(s));
      const matchType = propFilterType === 'ALL' || p.type === propFilterType;
      return matchSearch && matchType;
    });
  }, [appState.properties, propSearch, propFilterType]);

  // --- TAB 2: GROUPS STATE & FILTERS ---
  const [groupSearch, setGroupSearch] = useState('');
  const [groupFilterCategory, setGroupFilterCategory] = useState('ALL');

  const filteredGroups = useMemo(() => {
    const s = groupSearch.toLowerCase().trim();
    return appState.groups.filter((g) => {
      const matchSearch = g.name.toLowerCase().includes(s) || (g.note && g.note.toLowerCase().includes(s));
      const matchCat = groupFilterCategory === 'ALL' || g.category === groupFilterCategory;
      return matchSearch && matchCat;
    });
  }, [appState.groups, groupSearch, groupFilterCategory]);

  // Bulk group toggles
  const handleBulkToggleGroups = (active: boolean) => {
    setAppState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => ({ ...g, active }))
    }));
    showToast(active ? 'เปิดใช้งานกลุ่มทั้งหมดแล้ว' : 'ปิดใช้งานกลุ่มทั้งหมดแล้ว', 'info');
  };

  const handleToggleGroup = (id: string, active: boolean) => {
    setAppState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === id ? { ...g, active } : g))
    }));
  };

  // --- TAB 3: POSTER SEMI-AUTO ENGINE ---
  const [selectedPropId, setSelectedPropId] = useState<string>('');
  const [selectedTargetGroupIds, setSelectedTargetGroupIds] = useState<string[]>([]);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const [postedLinkInput, setPostedLinkInput] = useState('');

  // Active property for posting
  const selectedPropertyForPoster = useMemo(() => {
    return appState.properties.find((p) => p.id === selectedPropId) || null;
  }, [appState.properties, selectedPropId]);

  // Current active queue
  const currentQueue = useMemo(() => {
    if (!isQueueRunning) return [];
    return appState.groups.filter((g) => selectedTargetGroupIds.includes(g.id));
  }, [isQueueRunning, appState.groups, selectedTargetGroupIds]);

  const activeQueueGroup = currentQueue[queueIndex] || null;

  // Initialize selected target groups when groups load or change
  useEffect(() => {
    const activeIds = appState.groups.filter((g) => g.active).map((g) => g.id);
    setSelectedTargetGroupIds((prev) => {
      if (prev.length === 0) return activeIds;
      // Keep only existing IDs
      return prev.filter((id) => appState.groups.some((g) => g.id === id));
    });
  }, [appState.groups]);

  const handleStartQueue = () => {
    if (!selectedPropertyForPoster) {
      showToast('กรุณาเลือกรายการอสังหาฯ ก่อนกดเริ่มคิว', 'error');
      return;
    }
    if (selectedTargetGroupIds.length === 0) {
      showToast('กรุณาเลือกอย่างน้อย 1 กลุ่ม Facebook', 'error');
      return;
    }
    setQueueIndex(0);
    setPostedLinkInput('');
    setIsQueueRunning(true);
    showToast('เริ่มรันคิวช่วยโพสต์ Semi-Auto แล้ว!', 'success');
  };

  const handleCancelQueue = () => {
    setIsQueueRunning(false);
    setQueueIndex(0);
    setPostedLinkInput('');
    showToast('ยกเลิกคิวช่วยโพสต์แล้ว', 'info');
  };

  const handleExecuteCurrentStep = () => {
    if (!selectedPropertyForPoster || !activeQueueGroup) return;
    const caption = buildCaptionText(selectedPropertyForPoster);
    navigator.clipboard.writeText(caption);
    window.open(activeQueueGroup.url, '_blank');
    showToast('คัดลอกแคปชั่นเรียบร้อย และกำลังเปิดหน้ากลุ่ม Facebook', 'success');
  };

  const handleCopyFolderImagePath = () => {
    if (!selectedPropertyForPoster || !selectedPropertyForPoster.imgFolderPath) {
      showToast('รายการนี้ไม่ได้ตั้งค่า Path รูปภาพไว้', 'error');
      return;
    }
    navigator.clipboard.writeText(selectedPropertyForPoster.imgFolderPath);
    showToast(`คัดลอก Path รูปภาพเรียบร้อย: ${selectedPropertyForPoster.imgFolderPath}`, 'success');
  };

  const handleMarkAsDone = () => {
    if (!selectedPropertyForPoster || !activeQueueGroup) return;

    const newHistoryEntry: PostingHistory = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      propId: selectedPropertyForPoster.id,
      propTitle: selectedPropertyForPoster.title,
      groupId: activeQueueGroup.id,
      groupName: activeQueueGroup.name,
      posterName: appState.settings.agentName || 'User',
      postedLink: postedLinkInput.trim() || activeQueueGroup.url,
      status: 'สำเร็จ'
    };

    setAppState((prev) => ({
      ...prev,
      history: [newHistoryEntry, ...prev.history]
    }));

    setPostedLinkInput('');

    if (queueIndex + 1 >= currentQueue.length) {
      showToast('🎉 ดำเนินการคิวโพสต์ครบทุกกลุ่มแล้ว!', 'success');
      setIsQueueRunning(false);
      setQueueIndex(0);
    } else {
      setQueueIndex((prev) => prev + 1);
      showToast('บันทึกสำเร็จ! ไปยังกลุ่มถัดไป', 'success');
    }
  };

  const handleSkipGroup = () => {
    setPostedLinkInput('');
    if (queueIndex + 1 >= currentQueue.length) {
      showToast('สิ้นสุดคิวช่วยโพสต์แล้ว', 'info');
      setIsQueueRunning(false);
      setQueueIndex(0);
    } else {
      setQueueIndex((prev) => prev + 1);
      showToast('ข้ามกลุ่มนี้เรียบร้อย', 'info');
    }
  };

  // --- TAB 4: HISTORY STATE & FILTERS ---
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [historyStartDate, setHistoryStartDate] = useState(todayStr);
  const [historyEndDate, setHistoryEndDate] = useState(todayStr);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);

  const handleHistoryStartDateChange = (val: string) => {
    if (val && historyEndDate && val > historyEndDate) {
      setHistoryStartDate(val);
      setHistoryEndDate(val);
      showToast('วันที่เริ่มต้นมากกว่าวันที่สิ้นสุด ระบบปรับวันที่สิ้นสุดให้ตรงกันแล้ว', 'info');
    } else {
      setHistoryStartDate(val);
    }
  };

  const handleHistoryEndDateChange = (val: string) => {
    if (val && historyStartDate && val < historyStartDate) {
      setHistoryEndDate(val);
      setHistoryStartDate(val);
      showToast('วันที่สิ้นสุดน้อยกว่าวันที่เริ่มต้น ระบบปรับวันที่เริ่มต้นให้ตรงกันแล้ว', 'info');
    } else {
      setHistoryEndDate(val);
    }
  };

  const filteredHistory = useMemo(() => {
    const s = historySearch.toLowerCase().trim();
    // Safety check: ensure start date does not exceed end date
    const effectiveStart =
      historyStartDate && historyEndDate && historyStartDate > historyEndDate
        ? historyEndDate
        : historyStartDate;
    const effectiveEnd =
      historyStartDate && historyEndDate && historyEndDate < historyStartDate
        ? historyStartDate
        : historyEndDate;

    return appState.history.filter((h) => {
      const dateStr = h.timestamp ? h.timestamp.split('T')[0] : '';
      const matchesDate =
        (!effectiveStart || dateStr >= effectiveStart) &&
        (!effectiveEnd || dateStr <= effectiveEnd);
      const matchesSearch =
        h.propTitle.toLowerCase().includes(s) || h.groupName.toLowerCase().includes(s);
      return matchesDate && matchesSearch;
    });
  }, [appState.history, historyStartDate, historyEndDate, historySearch]);

  const handleToggleSelectAllHistory = (checked: boolean) => {
    if (checked) {
      setSelectedHistoryIds(filteredHistory.map((h) => h.id));
    } else {
      setSelectedHistoryIds([]);
    }
  };

  const handleToggleSelectHistory = (id: string) => {
    setSelectedHistoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // --- MODALS STATE ---
  // 1. Property Modal
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propFormState, setPropFormState] = useState<Partial<Property>>({});

  const handleOpenPropertyModal = (prop?: Property) => {
    if (prop) {
      setEditingProperty(prop);
      setPropFormState({ ...prop });
    } else {
      // Check free trial limitation (max 2 properties)
      if (isTrialMode && appState.properties.length >= TRIAL_MAX_PROPERTIES) {
        setIsUpgradeModalOpen(true);
        showToast(
          `เวอร์ชันทดลองใช้งานฟรีจำกัดสูงสุด ${TRIAL_MAX_PROPERTIES} ทรัพย์ กรุณาปลดล็อกเวอร์ชันเต็มเพื่อเพิ่มไม่จำกัด`,
          'error'
        );
        return;
      }
      setEditingProperty(null);
      const def = appState.settings;
      setPropFormState({
        id: `prop-${Date.now()}`,
        code: `PROP-${Date.now().toString().slice(-4)}`,
        title: '',
        type: 'คอนโด',
        dealType: 'ขาย',
        price: '',
        location: '',
        size: '',
        details: '',
        contact: `${def.agentName || ''} โทร: ${def.phone || ''} Line: ${def.lineId || ''}`,
        ownerContact: '',
        sourceUrl: '',
        imgFolderPath: def.folderPath || '',
        imgUrl: '',
        description: ''
      });
    }
    setIsPropertyModalOpen(true);
  };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propFormState.title) {
      showToast('กรุณากรอกหัวข้ออสังหาฯ', 'error');
      return;
    }
    const propToSave: Property = {
      id: editingProperty ? editingProperty.id : `prop-${Date.now()}`,
      code: propFormState.code?.trim() || '',
      title: propFormState.title?.trim() || '',
      type: propFormState.type || 'คอนโด',
      dealType: propFormState.dealType || 'ขาย',
      price: propFormState.price?.trim() || '',
      location: propFormState.location?.trim() || '',
      size: propFormState.size?.trim() || '',
      details: propFormState.details?.trim() || '',
      contact: propFormState.contact?.trim() || '',
      ownerContact: propFormState.ownerContact?.trim() || '',
      sourceUrl: propFormState.sourceUrl?.trim() || '',
      imgFolderPath: propFormState.imgFolderPath?.trim() || '',
      imgUrl: propFormState.imgUrl?.trim() || '',
      description: propFormState.description?.trim() || ''
    };

    setAppState((prev) => {
      const exists = prev.properties.some((p) => p.id === propToSave.id);
      return {
        ...prev,
        properties: exists
          ? prev.properties.map((p) => (p.id === propToSave.id ? propToSave : p))
          : [propToSave, ...prev.properties]
      };
    });

    setIsPropertyModalOpen(false);
    showToast(editingProperty ? 'อัปเดตข้อมูลอสังหาฯ เรียบร้อยแล้ว' : 'เพิ่มรายการอสังหาฯ สำเร็จ', 'success');
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setPropFormState((prev) => ({ ...prev, imgUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. Group Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FBGroup | null>(null);
  const [groupFormState, setGroupFormState] = useState<Partial<FBGroup>>({});

  const handleOpenGroupModal = (group?: FBGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupFormState({ ...group });
    } else {
      setEditingGroup(null);
      setGroupFormState({
        id: `grp-${Date.now()}`,
        name: '',
        url: '',
        category: 'คอนโด',
        note: '',
        active: true
      });
    }
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormState.name || !groupFormState.url) {
      showToast('กรุณากรอกชื่อกลุ่มและ URL กลุ่ม Facebook', 'error');
      return;
    }

    const groupToSave: FBGroup = {
      id: editingGroup ? editingGroup.id : `grp-${Date.now()}`,
      name: groupFormState.name.trim(),
      url: groupFormState.url.trim(),
      category: groupFormState.category || 'คอนโด',
      note: groupFormState.note?.trim() || '',
      active: editingGroup ? editingGroup.active : true
    };

    setAppState((prev) => {
      const exists = prev.groups.some((g) => g.id === groupToSave.id);
      return {
        ...prev,
        groups: exists
          ? prev.groups.map((g) => (g.id === groupToSave.id ? groupToSave : g))
          : [...prev.groups, groupToSave]
      };
    });

    setIsGroupModalOpen(false);
    showToast('บันทึกกลุ่ม Facebook สำเร็จ', 'success');
  };

  // 3. Caption Modal
  const [captionModalText, setCaptionModalText] = useState<string | null>(null);
  const [isCaptionCopied, setIsCaptionCopied] = useState(false);

  const handleOpenCaptionModal = (prop: Property) => {
    setCaptionModalText(buildCaptionText(prop));
    setIsCaptionCopied(false);
  };

  const handleCopyCaption = () => {
    if (captionModalText) {
      navigator.clipboard.writeText(captionModalText);
      setIsCaptionCopied(true);
      showToast('คัดลอกแคปชั่นเรียบร้อยแล้ว!', 'success');
      setTimeout(() => setIsCaptionCopied(false), 2000);
    }
  };

  // 4. Edit History Modal
  const [editingHistoryItem, setEditingHistoryItem] = useState<PostingHistory | null>(null);
  const [editHistoryUrl, setEditHistoryUrl] = useState('');

  const handleOpenEditHistory = (item: PostingHistory) => {
    setEditingHistoryItem(item);
    setEditHistoryUrl(item.postedLink);
  };

  const handleSaveEditHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHistoryItem) return;
    setAppState((prev) => ({
      ...prev,
      history: prev.history.map((h) =>
        h.id === editingHistoryItem.id ? { ...h, postedLink: editHistoryUrl.trim() } : h
      )
    }));
    setEditingHistoryItem(null);
    showToast('อัปเดตลิงก์โพสต์เรียบร้อยแล้ว', 'success');
  };

  // 5. Auth / Switch User Modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [newUserNameInput, setNewUserNameInput] = useState('');

  const handleSwitchUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserNameInput.trim()) return;
    setAppState((prev) => ({
      ...prev,
      settings: { ...prev.settings, agentName: newUserNameInput.trim() }
    }));
    setIsAuthModalOpen(false);
    setNewUserNameInput('');
    showToast(`สลับผู้ใช้เป็น: ${newUserNameInput.trim()}`, 'success');
  };

  // 6. Confirm Modal
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalData({ isOpen: true, title, message, onConfirm });
  };

  // Property Deletion
  const handleDeleteProperty = (id: string) => {
    openConfirm('ลบรายการอสังหาริมทรัพย์', 'คุณแน่ใจหรือไม่ว่าต้องการลบทรัพย์นี้ออกจากระบบ?', () => {
      setAppState((prev) => ({
        ...prev,
        properties: prev.properties.filter((p) => p.id !== id)
      }));
      showToast('ลบรายการอสังหาฯ เรียบร้อยแล้ว', 'info');
    });
  };

  // Group Deletion
  const handleDeleteGroup = (id: string) => {
    openConfirm('ลบกลุ่ม Facebook', 'คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่มนี้?', () => {
      setAppState((prev) => ({
        ...prev,
        groups: prev.groups.filter((g) => g.id !== id)
      }));
      showToast('ลบกลุ่ม Facebook เรียบร้อยแล้ว', 'info');
    });
  };

  // History Batch Delete
  const handleDeleteSelectedHistory = () => {
    if (selectedHistoryIds.length === 0) return;
    openConfirm(
      'ลบประวัติการโพสต์',
      `คุณแน่ใจหรือไม่ว่าต้องการลบประวัติที่เลือกจำนวน ${selectedHistoryIds.length} รายการ?`,
      () => {
        setAppState((prev) => ({
          ...prev,
          history: prev.history.filter((h) => !selectedHistoryIds.includes(h.id))
        }));
        setSelectedHistoryIds([]);
        showToast('ลบประวัติที่เลือกเรียบร้อยแล้ว', 'info');
      }
    );
  };

  // History Clear All
  const handleClearAllHistory = () => {
    openConfirm('ล้างประวัติทั้งหมด', 'คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการโพสต์ทั้งหมด?', () => {
      setAppState((prev) => ({ ...prev, history: [] }));
      setSelectedHistoryIds([]);
      showToast('ล้างประวัติการโพสต์ทั้งหมดเรียบร้อยแล้ว', 'info');
    });
  };

  // Copy local image folder path by property ID
  const handleCopyPropPath = (prop: Property) => {
    if (!prop.imgFolderPath) {
      showToast('ไม่มีข้อมูล Folder Path', 'error');
      return;
    }
    navigator.clipboard.writeText(prop.imgFolderPath);
    showToast(`คัดลอก Path รูปภาพเรียบร้อย: ${prop.imgFolderPath}`, 'success');
  };

  // --- Excel Import Handler ---
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const defaultContact = `${appState.settings.agentName || ''} โทร: ${appState.settings.phone || ''} Line: ${appState.settings.lineId || ''}`;
      const importedProps = await parsePropertiesExcel(
        file,
        defaultContact,
        appState.settings.folderPath
      );

      if (importedProps.length === 0) {
        showToast('ไม่พบข้อมูลในไฟล์ Excel หรือรูปแบบคอลัมน์ไม่ตรง', 'error');
        return;
      }

      let propsToAdd = importedProps;
      if (isTrialMode) {
        const remainingQuota = TRIAL_MAX_PROPERTIES - appState.properties.length;
        if (remainingQuota <= 0) {
          setIsUpgradeModalOpen(true);
          showToast(
            `เวอร์ชันทดลองจำกัดสูงสุด ${TRIAL_MAX_PROPERTIES} ทรัพย์ ไม่สามารถนำเข้าเพิ่มได้ กรุณาปลดล็อกเวอร์ชันเต็ม`,
            'error'
          );
          return;
        }
        if (importedProps.length > remainingQuota) {
          propsToAdd = importedProps.slice(0, remainingQuota);
          showToast(
            `เวอร์ชันทดลองจำกัดสูงสุด ${TRIAL_MAX_PROPERTIES} ทรัพย์ (นำเข้าให้เฉพาะ ${propsToAdd.length} รายการแรก)`,
            'info'
          );
          setIsUpgradeModalOpen(true);
        }
      }

      setAppState((prev) => ({
        ...prev,
        properties: [...propsToAdd, ...prev.properties]
      }));

      showToast(`นำเข้าข้อมูลอสังหาริมทรัพย์สำเร็จ ${propsToAdd.length} รายการ`, 'success');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบไฟล์', 'error');
    } finally {
      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = '';
      }
    }
  };

  // --- JSON Database Backup & Restore ---
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const handleExportDatabase = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `SafeAssist_Backup_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('ส่งออกไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว', 'success');
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        if (imported && (imported.properties || imported.groups)) {
          // Preserve license activation:
          // If this machine is already activated, never demote it back to trial
          const currentLicense = appState.license;
          const resolvedLicense =
            (currentLicense && currentLicense.isActivated)
              ? currentLicense
              : (imported.license && imported.license.isActivated ? imported.license : currentLicense || { isActivated: false });

          const updatedState: AppState = {
            properties: Array.isArray(imported.properties) ? imported.properties : appState.properties,
            groups: Array.isArray(imported.groups) ? imported.groups : appState.groups,
            history: Array.isArray(imported.history) ? imported.history : appState.history,
            settings: imported.settings ? { ...DEFAULT_SETTINGS, ...imported.settings } : appState.settings,
            license: resolvedLicense
          };

          setAppState(updatedState);
          saveAppState(updatedState);
          showToast('นำเข้าและกู้คืนข้อมูลสำเร็จเรียบร้อย', 'success');
        } else {
          showToast('ไฟล์สำรองไม่ถูกต้อง', 'error');
        }
      } catch (err) {
        showToast('ไฟล์ JSON ไม่ถูกต้อง', 'error');
      }
    };
    reader.readAsText(file);
    if (jsonFileInputRef.current) {
      jsonFileInputRef.current.value = '';
    }
  };

  // --- TAB 5: Save Settings ---
  const [settingsForm, setSettingsForm] = useState<Settings>(() => appState.settings);
  useEffect(() => {
    setSettingsForm(appState.settings);
  }, [appState.settings]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setAppState((prev) => ({
      ...prev,
      settings: settingsForm
    }));
    showToast('บันทึกการตั้งค่าผู้ลงประกาศสำเร็จ!', 'success');
  };

  // Statistics calculation
  const totalProps = appState.properties.length;
  const activeGroupsCount = appState.groups.filter((g) => g.active).length;
  const postedTodayCount = appState.history.filter(
    (h) => h.timestamp && h.timestamp.startsWith(todayStr)
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={excelFileInputRef}
        onChange={handleExcelImport}
        className="hidden"
        accept=".xlsx, .xls, .csv"
      />
      <input
        type="file"
        ref={jsonFileInputRef}
        onChange={handleImportDatabase}
        className="hidden"
        accept=".json"
      />

      {/* ================= HEADER ================= */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <i className="fa-solid fa-building-circle-check text-xl"></i>
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">
                  SafeAssist <span className="text-blue-500 font-extrabold">Poster Pro</span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span
                    onClick={() => setIsSellerModalOpen(true)}
                    className="cursor-pointer hover:text-blue-500 transition-colors"
                    title="ผู้ดูแลระบบ"
                  >
                    ระบบ
                  </span>
                  ช่วยโพสต์อสังหาฯ หลายกลุ่ม Facebook ปลอดภัย 100%
                </p>
              </div>
            </div>

            {/* Account Status & Theme Controls */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition text-xs font-medium cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
                  {appState.settings.agentName
                    ? appState.settings.agentName.charAt(0).toUpperCase()
                    : 'U'}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {appState.settings.agentName || 'ผู้ใช้งานระบบ'}
                </span>
                <i className="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
              </button>

              <button
                onClick={handleExportDatabase}
                title="สำรองข้อมูล (JSON)"
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition text-xs font-medium flex items-center space-x-1 cursor-pointer"
              >
                <i className="fa-solid fa-download text-blue-500"></i>
                <span className="hidden sm:inline">Backup</span>
              </button>

              <button
                onClick={() => jsonFileInputRef.current?.click()}
                title="นำเข้าข้อมูล (JSON)"
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition text-xs font-medium flex items-center space-x-1 cursor-pointer"
              >
                <i className="fa-solid fa-upload text-emerald-500"></i>
                <span className="hidden sm:inline">Restore</span>
              </button>

              {/* License Status Badge / Upgrade Button */}
              {isActivated ? (
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition hover:bg-amber-500/20 cursor-pointer shadow-sm"
                  title="คลิกเพื่อดูสถานะสิทธิ์การใช้งาน Lifetime VIP"
                >
                  <i className="fa-solid fa-crown text-amber-500"></i>
                  <span className="hidden sm:inline">Lifetime VIP</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-amber-500/25 transition cursor-pointer"
                  title="คลิกเพื่อปลดล็อกเวอร์ชันเต็มตลอดชีพ"
                >
                  <i className="fa-solid fa-crown text-yellow-200"></i>
                  <span className="hidden md:inline">ทดลองใช้ ({appState.properties.length}/{TRIAL_MAX_PROPERTIES})</span>
                  <span className="md:hidden">({appState.properties.length}/2)</span>
                  <span className="ml-1 bg-black/20 text-white px-1.5 py-0.5 rounded-lg text-[10px]">ปลดล็อก 👑</span>
                </button>
              )}

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

              <button
                onClick={toggleTheme}
                className="flex items-center px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-amber-400 font-medium transition text-xs shadow-inner cursor-pointer"
              >
                <i
                  className={`fa-solid ${
                    isDarkMode ? 'fa-sun text-amber-400' : 'fa-moon text-slate-600'
                  } text-sm mr-1.5`}
                ></i>
                <span>{isDarkMode ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation Bar */}
          <div className="flex space-x-1 sm:space-x-4 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-700/50">
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center space-x-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === 'properties'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-city"></i>
              <span>รายการอสังหาริมทรัพย์</span>
              <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-full font-bold">
                {totalProps}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center space-x-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === 'groups'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <i className="fa-brands fa-facebook"></i>
              <span>กลุ่ม Facebook</span>
              <span className="ml-1 px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full font-bold">
                {appState.groups.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('poster')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center space-x-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === 'poster'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-paper-plane text-emerald-500"></i>
              <span>ศูนย์รันโพสต์ Semi-Auto</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center space-x-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-clock-rotate-left"></i>
              <span>ประวัติการโพสต์</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center space-x-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <i className="fa-solid fa-sliders"></i>
              <span>ตั้งค่าผู้ลงประกาศ & ค่า Default</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full">
        {/* Top Statistics Dashboard Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <i className="fa-solid fa-house-user text-xl"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">ทรัพย์ในระบบ</p>
              <p className="text-xl font-extrabold">{totalProps}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <i className="fa-solid fa-users text-xl"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">กลุ่มพร้อมใช้งาน</p>
              <p className="text-xl font-extrabold">{activeGroupsCount}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl">
              <i className="fa-solid fa-circle-check text-xl"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">โพสต์แล้ววันนี้</p>
              <p className="text-xl font-extrabold">{postedTodayCount}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <i className="fa-solid fa-database text-xl"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">สถานะฐานข้อมูล</p>
              <p className="text-xs font-bold text-emerald-500 flex items-center mt-1">
                <i className="fa-solid fa-circle text-[8px] mr-1 animate-pulse"></i> Online Sync
              </p>
            </div>
          </div>
        </div>

        {/* ================= TAB 1: PROPERTIES ================= */}
        {activeTab === 'properties' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="flex flex-1 items-center space-x-2">
                <div className="relative flex-1">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400"></i>
                  <input
                    type="text"
                    value={propSearch}
                    onChange={(e) => setPropSearch(e.target.value)}
                    placeholder="ค้นหาชื่อโครงการ, ทำเล, หรือรหัส..."
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                <select
                  value={propFilterType}
                  onChange={(e) => setPropFilterType(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="ALL">ทุกประเภทอสังหาฯ</option>
                  <option value="คอนโด">คอนโด</option>
                  <option value="บ้านเดี่ยว">บ้านเดี่ยว</option>
                  <option value="ทาวน์โฮม">ทาวน์โฮม</option>
                  <option value="ที่ดิน">ที่ดิน</option>
                  <option value="อาคารพาณิชย์">อาคารพาณิชย์</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetPropViewMode('grid')}
                  title="แสดงแบบ Thumbnail"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 cursor-pointer ${
                    propViewMode === 'grid'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <i className="fa-solid fa-border-all"></i>
                  <span className="hidden sm:inline">Thumbnail</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPropViewMode('list')}
                  title="แสดงแบบ List"
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 cursor-pointer ${
                    propViewMode === 'list'
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <i className="fa-solid fa-list"></i>
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => excelFileInputRef.current?.click()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-sm font-medium transition flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <i className="fa-solid fa-file-excel text-base"></i>
                  <span>นำเข้า Excel</span>
                </button>

                <button
                  onClick={downloadExcelTemplate}
                  title="ดาวน์โหลดไฟล์ตัวอย่างแม่แบบ Excel"
                  className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-sm font-medium transition flex items-center justify-center space-x-1 border border-slate-200 dark:border-slate-600 cursor-pointer"
                >
                  <i className="fa-solid fa-download text-emerald-500"></i>
                  <span className="hidden sm:inline">แม่แบบ Excel</span>
                </button>

                <button
                  onClick={() => handleOpenPropertyModal()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <i className="fa-solid fa-plus"></i>
                  <span>เพิ่มอสังหาริมทรัพย์</span>
                </button>
              </div>
            </div>

            {/* Trial Mode Notification Banner */}
            {isTrialMode && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-300 dark:border-amber-700/60 rounded-2xl text-xs gap-3 shadow-sm">
                <div className="flex items-center space-x-3">
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                    <i className="fa-solid fa-crown text-base"></i>
                  </span>
                  <div>
                    <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                      สิทธิ์ทดลองใช้งานฟรี: จำกัดบันทึกได้ {TRIAL_MAX_PROPERTIES} ทรัพย์ (ใช้งานแล้ว {appState.properties.length}/{TRIAL_MAX_PROPERTIES})
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">
                      ปลดล็อกเวอร์ชันเต็ม (Lifetime VIP) เพื่อบันทึกทรัพย์ไม่จำกัด นำเข้า Excel ไม่อั้น ซื้อขาดครั้งเดียวใช้งานได้ตลอดชีพ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-md transition cursor-pointer shrink-0 flex items-center space-x-1.5"
                >
                  <i className="fa-solid fa-unlock-keyhole"></i>
                  <span>ปลดล็อกเวอร์ชันเต็ม 👑</span>
                </button>
              </div>
            )}

            {/* Properties List/Grid */}
            {filteredProperties.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <i className="fa-solid fa-building-circle-xmark text-4xl mb-3 block text-slate-300 dark:text-slate-600"></i>
                <p className="text-base font-medium">ไม่พบรายการอสังหาริมทรัพย์</p>
                <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเพิ่มทรัพย์ใหม่</p>
              </div>
            ) : propViewMode === 'list' ? (
              <div className="space-y-3">
                {filteredProperties.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-3 sm:p-4 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-3.5 w-full sm:w-auto flex-1 min-w-0">
                      <div className="relative w-20 h-20 sm:w-24 sm:h-20 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">
                        <img
                          src={
                            p.imgUrl ||
                            'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80'
                          }
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80';
                          }}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                        {p.code && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] font-mono font-bold rounded">
                            {p.code}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[11px] font-semibold rounded-md">
                            {p.type} ({p.dealType})
                          </span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-sm sm:text-base">
                            {p.price}
                          </span>
                        </div>
                        <h4
                          className="font-bold text-xs sm:text-sm truncate text-slate-900 dark:text-white"
                          title={p.title}
                        >
                          {p.title}
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                          <span>
                            <i className="fa-solid fa-location-dot text-slate-400 mr-1"></i>
                            {p.location || '-'}
                          </span>
                          <span>
                            <i className="fa-solid fa-vector-square text-slate-400 mr-1"></i>
                            {p.size || '-'} | {p.details || '-'}
                          </span>
                        </div>
                        {p.imgFolderPath && (
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center space-x-1 pt-0.5">
                            <i className="fa-solid fa-folder text-amber-500"></i>
                            <span
                              className="truncate max-w-[180px] sm:max-w-[280px]"
                              title={p.imgFolderPath}
                            >
                              {p.imgFolderPath}
                            </span>
                            <button
                              onClick={() => handleCopyPropPath(p)}
                              className="text-blue-500 hover:underline text-[10px] ml-1 shrink-0 cursor-pointer"
                            >
                              [Copy]
                            </button>
                          </div>
                        )}
                        {p.ownerContact && (
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center space-x-1 pt-0.5">
                            <i className="fa-solid fa-user-lock w-4 text-amber-600"></i>
                            <span
                              className="truncate max-w-[180px] sm:max-w-[280px]"
                              title={p.ownerContact}
                            >
                              เจ้าของ:{p.ownerContact}
                            </span>
                            {p.sourceUrl && (
                              <span
                                className="text-sky-600 truncate max-w-[180px] sm:max-w-[280px]"
                                title={p.sourceUrl}
                              >
                                <a
                                  href={p.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline hover:text-sky-800 dark:hover:text-sky-200"
                                >
                                  <i className="fa-solid fa-link w-4 text-sky-600"></i>
                                  เปิดโพสต์เจ้าของทรัพย์{' '}
                                  <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                </a>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-700">
                      <button
                        onClick={() => handleOpenCaptionModal(p)}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
                      >
                        <i className="fa-regular fa-copy"></i>
                        <span>แคปชั่น</span>
                      </button>
                      <button
                        onClick={() => handleOpenPropertyModal(p)}
                        className="p-2 text-slate-500 hover:text-blue-500 rounded-lg text-sm transition cursor-pointer"
                        title="แก้ไข"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(p.id)}
                        className="p-2 text-slate-500 hover:text-rose-500 rounded-lg text-sm transition cursor-pointer"
                        title="ลบ"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-48 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <img
                          src={
                            p.imgUrl ||
                            'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80'
                          }
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80';
                          }}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold rounded-lg">
                          {p.type} ({p.dealType})
                        </span>
                        {p.code && (
                          <span className="absolute top-3 right-3 px-2 py-1 bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-mono font-bold rounded-lg shadow">
                            <i className="fa-solid fa-hashtag"></i> {p.code}
                          </span>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <h4 className="font-bold text-base line-clamp-2 text-slate-900 dark:text-white">
                          {p.title}
                        </h4>
                        <p className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                          {p.price}
                        </p>
                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                          <p>
                            <i className="fa-solid fa-location-dot w-4 text-slate-400"></i>{' '}
                            {p.location || '-'}
                          </p>
                          <p>
                            <i className="fa-solid fa-vector-square w-4 text-slate-400"></i>{' '}
                            {p.size || '-'} | {p.details || '-'}
                          </p>
                          {p.ownerContact && (
                            <p
                              className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg text-[11px] font-medium border border-amber-200 dark:border-amber-800/40 mt-1 truncate"
                              title={p.ownerContact}
                            >
                              <i className="fa-solid fa-user-lock w-4"></i> เจ้าของ: {p.ownerContact}
                            </p>
                          )}
                          {p.sourceUrl && (
                            <p
                              className="text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 p-1.5 rounded-lg text-[11px] font-medium border border-sky-200 dark:border-sky-800/40 mt-1 truncate"
                              title={p.sourceUrl}
                            >
                              <i className="fa-solid fa-link w-4"></i>{' '}
                              <a
                                href={p.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-sky-800 dark:hover:text-sky-200"
                              >
                                เปิดโพสต์เจ้าของทรัพย์{' '}
                                <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                              </a>
                            </p>
                          )}
                          {p.imgFolderPath && (
                            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-mono text-[11px] bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 mt-1">
                              <span className="truncate mr-2" title={p.imgFolderPath}>
                                <i className="fa-solid fa-folder text-amber-500 mr-1"></i>
                                {p.imgFolderPath}
                              </span>
                              <button
                                onClick={() => handleCopyPropPath(p)}
                                className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded font-sans text-[10px] font-semibold transition flex items-center shrink-0 space-x-1 cursor-pointer"
                                title="คัดลอก Path"
                              >
                                <i className="fa-regular fa-copy"></i>
                                <span>Copy</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenCaptionModal(p)}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
                      >
                        <i className="fa-regular fa-copy"></i>
                        <span>ดูแคปชั่น</span>
                      </button>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleOpenPropertyModal(p)}
                          className="p-2 text-slate-500 hover:text-blue-500 rounded-lg text-sm transition cursor-pointer"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteProperty(p.id)}
                          className="p-2 text-slate-500 hover:text-rose-500 rounded-lg text-sm transition cursor-pointer"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ================= TAB 2: FB GROUPS ================= */}
        {activeTab === 'groups' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="flex flex-1 items-center space-x-2">
                <div className="relative flex-1">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400"></i>
                  <input
                    type="text"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="ค้นหาชื่อกลุ่ม Facebook..."
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                <select
                  value={groupFilterCategory}
                  onChange={(e) => setGroupFilterCategory(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="ALL">ทุกหมวดหมู่กลุ่ม</option>
                  <option value="คอนโด">กลุ่มคอนโด</option>
                  <option value="บ้านเดี่ยว/ทาวน์โฮม">กลุ่มบ้าน/ทาวน์โฮม</option>
                  <option value="ทั่วไป/ซื้อขายอสังหา">กลุ่มอสังหาฯ ทั่วไป</option>
                  <option value="ทำเลเฉพาะ">กลุ่มรายทำเล/พื้นที่</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkToggleGroups(true)}
                  className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 px-3 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-1 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                >
                  <i className="fa-solid fa-check-double"></i>
                  <span>เปิดทั้งหมด</span>
                </button>
                <button
                  onClick={() => handleBulkToggleGroups(false)}
                  className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 px-3 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-1 border border-slate-200 dark:border-slate-600 cursor-pointer"
                >
                  <i className="fa-solid fa-ban"></i>
                  <span>ปิดทั้งหมด</span>
                </button>
                <button
                  onClick={() => handleOpenGroupModal()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <i className="fa-solid fa-plus"></i>
                  <span>เพิ่มกลุ่ม FB</span>
                </button>
              </div>
            </div>

            {/* Groups Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-4 w-16">สถานะ</th>
                      <th className="p-4">ชื่อกลุ่ม Facebook</th>
                      <th className="p-4">หมวดหมู่</th>
                      <th className="p-4">หมายเหตุ</th>
                      <th className="p-4 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredGroups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          ไม่พบกลุ่ม Facebook ในระบบ
                        </td>
                      </tr>
                    ) : (
                      filteredGroups.map((g) => (
                        <tr
                          key={g.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition"
                        >
                          <td className="p-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={g.active}
                                onChange={(e) => handleToggleGroup(g.id, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </td>
                          <td className="p-4 font-semibold text-slate-900 dark:text-white">
                            <a
                              href={g.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-blue-500 flex items-center space-x-1.5"
                            >
                              <span>{g.name}</span>
                              <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-400"></i>
                            </a>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg font-medium">
                              {g.category}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                            {g.note || '-'}
                          </td>
                          <td className="p-4 text-right space-x-1">
                            <button
                              onClick={() => handleOpenGroupModal(g)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 rounded cursor-pointer"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(g.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ================= TAB 3: SEMI-AUTO POSTER ================= */}
        {activeTab === 'poster' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Step Controls Left Panel */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <h3 className="font-bold text-sm flex items-center text-blue-600 dark:text-blue-400">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 text-xs flex items-center justify-center mr-2 font-bold">
                    1
                  </span>
                  เลือกรายการอสังหาฯ ที่ต้องการโพสต์
                </h3>
                <select
                  value={selectedPropId}
                  onChange={(e) => setSelectedPropId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="">-- โปรดเลือกรายการอสังหาฯ --</option>
                  {appState.properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.type} - {p.title} ({p.price})
                    </option>
                  ))}
                </select>

                {selectedPropertyForPoster && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
                    <p className="font-bold text-blue-600 dark:text-blue-400">
                      {selectedPropertyForPoster.title}
                    </p>
                    <p className="text-slate-500">
                      {selectedPropertyForPoster.dealType} | {selectedPropertyForPoster.price} |{' '}
                      {selectedPropertyForPoster.location || ''}
                    </p>
                    {selectedPropertyForPoster.imgFolderPath && (
                      <p className="font-mono text-amber-500 truncate flex items-center">
                        <i className="fa-solid fa-folder text-amber-500 mr-1.5"></i>
                        <span>{selectedPropertyForPoster.imgFolderPath}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm flex items-center text-blue-600 dark:text-blue-400">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 text-xs flex items-center justify-center mr-2 font-bold">
                      2
                    </span>
                    เลือกกลุ่ม Facebook เป้าหมาย
                  </h3>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTargetGroupIds(
                          appState.groups.filter((g) => g.active).map((g) => g.id)
                        )
                      }
                      title="เลือกทั้งหมด"
                      className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-800/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-lg text-xs font-medium transition flex items-center space-x-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-check-double text-blue-500"></i>
                      <span>เลือกทั้งหมด</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTargetGroupIds([])}
                      title="ไม่เลือกทั้งหมด"
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium transition flex items-center space-x-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-square-xmark text-slate-400"></i>
                      <span>ไม่เลือกทั้งหมด</span>
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {appState.groups.filter((g) => g.active).length === 0 ? (
                    <p className="text-xs text-slate-400 p-2">
                      ไม่มีกลุ่มที่เปิดใช้งาน กรุณาเปิดใช้งานกลุ่มในแท็บ Facebook Groups
                    </p>
                  ) : (
                    appState.groups
                      .filter((g) => g.active)
                      .map((g) => {
                        const isChecked = selectedTargetGroupIds.includes(g.id);
                        return (
                          <label
                            key={g.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition text-xs cursor-pointer ${
                              isChecked
                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTargetGroupIds((prev) => [...prev, g.id]);
                                  } else {
                                    setSelectedTargetGroupIds((prev) =>
                                      prev.filter((id) => id !== g.id)
                                    );
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                {g.name}
                              </span>
                            </div>
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md shrink-0 ml-1">
                              {g.category}
                            </span>
                          </label>
                        );
                      })
                  )}
                </div>
              </div>

              <button
                onClick={handleStartQueue}
                disabled={isQueueRunning}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition flex items-center justify-center space-x-2 text-base cursor-pointer"
              >
                <i className="fa-solid fa-circle-play"></i>
                <span>เริ่มคิวช่วยโพสต์ Semi-Auto</span>
              </button>
            </div>

            {/* Right Runner Workstation Panel */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-full flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isQueueRunning ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                        }`}
                      ></div>
                      <h3 className="font-bold text-lg">SafeAssist Execution Console</h3>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isQueueRunning
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {isQueueRunning ? 'กำลังรันคิว' : 'หยุดทำงาน'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>
                        ความคืบหน้า {currentQueue.length > 0 ? queueIndex : 0} /{' '}
                        {currentQueue.length} กลุ่ม
                      </span>
                      <span>
                        {currentQueue.length > 0
                          ? Math.round((queueIndex / currentQueue.length) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-300"
                        style={{
                          width: `${
                            currentQueue.length > 0
                              ? Math.round((queueIndex / currentQueue.length) * 100)
                              : 0
                          }%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Current Active Group Box */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      กลุ่ม Facebook ในลำดับปัจจุบัน
                    </p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                          {activeQueueGroup
                            ? activeQueueGroup.name
                            : 'ยังไม่มีคิวที่กำลังรัน'}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {activeQueueGroup
                            ? `หมวดหมู่: ${activeQueueGroup.category} | หมายเหตุ: ${
                                activeQueueGroup.note || '-'
                              }`
                            : 'เลือกรายการทางซ้ายมือแล้วกดเริ่มคิว'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button
                          onClick={handleExecuteCurrentStep}
                          disabled={!isQueueRunning}
                          className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
                        >
                          <i className="fa-regular fa-copy"></i>
                          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                          <span>ก๊อปแคปชั่น & เปิดกลุ่ม</span>
                        </button>
                        <button
                          onClick={handleCopyFolderImagePath}
                          disabled={!isQueueRunning}
                          className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
                        >
                          <i className="fa-solid fa-folder-open"></i>
                          <span>คัดลอก Path รูป</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center">
                        <i className="fa-solid fa-link text-blue-500 mr-1.5"></i>
                        <span>
                          Link Posted (วาง URL โพสต์เมื่อโพสต์เสร็จเรียบร้อยเพื่อบันทึกประวัติ):
                        </span>
                      </label>
                      <input
                        type="url"
                        value={postedLinkInput}
                        onChange={(e) => setPostedLinkInput(e.target.value)}
                        disabled={!isQueueRunning}
                        placeholder="เช่น https://www.facebook.com/groups/xxx/posts/123456789/"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed transition"
                      />
                    </div>
                  </div>

                  {/* Caption Preview Area */}
                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-medium text-slate-500">
                      ข้อความแคปชั่นเตรียมส่งออก:
                    </label>
                    <textarea
                      readOnly
                      rows={7}
                      value={
                        selectedPropertyForPoster
                          ? buildCaptionText(selectedPropertyForPoster)
                          : ''
                      }
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono leading-relaxed outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Queue Control Buttons */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4 gap-2">
                  <button
                    onClick={handleCancelQueue}
                    disabled={!isQueueRunning}
                    className="px-4 py-2 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-medium transition flex items-center cursor-pointer"
                  >
                    <i className="fa-solid fa-circle-stop mr-1"></i> ยกเลิกคิวช่วยโพสต์
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSkipGroup}
                      disabled={!isQueueRunning}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 disabled:opacity-50 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
                    >
                      <i className="fa-solid fa-forward mr-1"></i> ข้ามกลุ่มนี้
                    </button>
                    <button
                      onClick={handleMarkAsDone}
                      disabled={!isQueueRunning}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition shadow-md cursor-pointer"
                    >
                      <i className="fa-solid fa-check mr-1"></i> ยืนยันว่าโพสต์แล้ว -&gt; กลุ่มถัดไป
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= TAB 4: POSTING HISTORY ================= */}
        {activeTab === 'history' && (
          <section className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center">
                  <i className="fa-solid fa-clock-rotate-left text-blue-500 mr-2"></i>
                  ประวัติบันทึกการโพสต์
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ค้นหา กรองตามช่วงวันที่ และจัดการรายการประวัติการโพสต์
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDeleteSelectedHistory}
                  disabled={selectedHistoryIds.length === 0}
                  className={`px-3 py-2 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                    selectedHistoryIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <i className="fa-solid fa-trash-can text-rose-500"></i>
                  <span>ลบรายการที่เลือก</span>
                  {selectedHistoryIds.length > 0 && (
                    <span className="font-bold">({selectedHistoryIds.length})</span>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (appState.history.length === 0) {
                      showToast('ไม่มีประวัติการโพสต์สำหรับ Export', 'error');
                      return;
                    }
                    exportHistoryExcel(appState.history);
                    showToast('Export ไฟล์ประวัติเรียบร้อยแล้ว', 'success');
                  }}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-file-csv text-emerald-500 text-base"></i>
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={handleClearAllHistory}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-broom text-amber-500"></i>
                  <span>ล้างประวัติทั้งหมด</span>
                </button>
              </div>
            </div>

            {/* Date and Search Filter */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <i className="fa-regular fa-calendar-days text-blue-500"></i>
                  <span>กรองตามช่วงวันที่:</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <label className="block text-[10px] text-slate-400 font-medium mb-0.5">
                      วันที่เริ่มต้น
                    </label>
                    <input
                      type="date"
                      value={historyStartDate}
                      max={historyEndDate || undefined}
                      onChange={(e) => handleHistoryStartDateChange(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                    />
                  </div>
                  <span className="text-slate-400 self-end pb-1.5">-</span>
                  <div className="relative">
                    <label className="block text-[10px] text-slate-400 font-medium mb-0.5">
                      วันที่สิ้นสุด
                    </label>
                    <input
                      type="date"
                      value={historyEndDate}
                      min={historyStartDate || undefined}
                      onChange={(e) => handleHistoryEndDateChange(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setHistoryStartDate(todayStr);
                      setHistoryEndDate(todayStr);
                    }}
                    title="ล้างตัวกรองวันที่"
                    className="self-end mb-0.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium transition flex items-center space-x-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left"></i>
                    <span>รีเซ็ต</span>
                  </button>
                </div>
              </div>

              <div className="relative w-full md:w-64">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="ค้นหาประวัติ..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredHistory.length > 0 &&
                            selectedHistoryIds.length === filteredHistory.length
                          }
                          onChange={(e) => handleToggleSelectAllHistory(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-4">วัน-เวลา</th>
                      <th className="p-4">รายการอสังหาฯ</th>
                      <th className="p-4">กลุ่ม Facebook</th>
                      <th className="p-4">ผู้โพสต์</th>
                      <th className="p-4">Link Posted</th>
                      <th className="p-4">สถานะ</th>
                      <th className="p-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          ไม่พบประวัติการโพสต์ในช่วงเวลานี้
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((h) => (
                        <tr
                          key={h.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition"
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedHistoryIds.includes(h.id)}
                              onChange={() => handleToggleSelectHistory(h.id)}
                              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 font-mono text-slate-500">
                            {new Date(h.timestamp).toLocaleString('th-TH')}
                          </td>
                          <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                            {h.propTitle}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-300">{h.groupName}</td>
                          <td className="p-4">{h.posterName}</td>
                          <td className="p-4">
                            {h.postedLink ? (
                              <a
                                href={h.postedLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 underline truncate block max-w-[150px]"
                              >
                                <i className="fa-solid fa-link text-[10px] mr-1"></i>
                                เปิดลิงก์
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded font-bold">
                              {h.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleOpenEditHistory(h)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 rounded cursor-pointer"
                              title="แก้ไขลิงก์"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ================= TAB 5: DEFAULT SETTINGS ================= */}
        {activeTab === 'settings' && (
          <section className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center">
                  <i className="fa-solid fa-address-card text-blue-500 mr-2"></i>
                  ตั้งค่าข้อมูลการติดต่อค่าเริ่มต้น
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ข้อมูลตรงนี้จะถูกนำไปใช้ใส่ในช่อง "ข้อมูลติดต่อ" โดยอัตโนมัติทุกครั้งเมื่อเพิ่มรายการอสังหาฯ ใหม่
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium text-xs">
                      ชื่อนายหน้า / ชื่อผู้ติดต่อ *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.agentName}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, agentName: e.target.value }))
                      }
                      placeholder="เช่น คุณเอ (Agent)"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-medium text-xs">
                      เบอร์โทรศัพท์ติดต่อ *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.phone}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="เช่น 081-234-5678"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-medium text-xs">
                      LINE ID / Line Official
                    </label>
                    <input
                      type="text"
                      value={settingsForm.lineId}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, lineId: e.target.value }))
                      }
                      placeholder="เช่น @myrealestate"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-medium text-xs">
                      Facebook Page / Profile URL
                    </label>
                    <input
                      type="text"
                      value={settingsForm.fbPage}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, fbPage: e.target.value }))
                      }
                      placeholder="เช่น fb.com/myrealestate"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block mb-1 font-medium text-xs">
                      Path โฟลเดอร์เก็บรูปภาพหลักในเครื่อง (Default Base Folder Path)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.folderPath}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, folderPath: e.target.value }))
                      }
                      placeholder="เช่น C:\Users\Admin\Pictures\RealEstate"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-floppy-disk"></i>
                    <span>บันทึกการตั้งค่า</span>
                  </button>
                </div>
              </form>
            </div>

            {/* License & Subscription Status Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3 gap-2">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <i className="fa-solid fa-crown text-lg"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      สถานะสิทธิ์การใช้งาน (License Status)
                    </h4>
                    <p className="text-xs text-slate-400">
                      ข้อมูลสิทธิ์และโควตาการใช้งานของระบบ SafeAssist Poster Pro
                    </p>
                  </div>
                </div>
                {isActivated ? (
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 rounded-full text-xs font-bold flex items-center space-x-1 self-start sm:self-auto">
                    <i className="fa-solid fa-check text-[10px]"></i>
                    <span>Lifetime VIP (เปิดใช้งานแล้ว)</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded-full text-xs font-bold flex items-center space-x-1 self-start sm:self-auto">
                    <i className="fa-solid fa-hourglass-half text-[10px]"></i>
                    <span>ทดลองใช้งานฟรี (จำกัด {TRIAL_MAX_PROPERTIES} ทรัพย์)</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                  <span className="text-slate-400">รหัสเครื่อง (Device ID):</span>
                  <p className="font-mono font-bold text-blue-600 dark:text-blue-400">{deviceId}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                  <span className="text-slate-400">โควตารายการอสังหาริมทรัพย์:</span>
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    {isActivated ? 'ไม่จำกัด (Unlimited)' : `${appState.properties.length} / ${TRIAL_MAX_PROPERTIES} ทรัพย์`}
                  </p>
                </div>
              </div>

              {!isActivated && (
                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer flex items-center space-x-1.5"
                  >
                    <i className="fa-solid fa-crown"></i>
                    <span>ปลดล็อกเวอร์ชันเต็มตลอดชีพ 👑</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ================= FOOTER: LUMINAQ SOFT BRANDING ================= */}
      <Footer onSecretSellerClick={() => setIsSellerModalOpen(true)} />

      {/* ================= MODAL: ADD / EDIT PROPERTY ================= */}
      {isPropertyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-lg">
                {editingProperty ? 'แก้ไขรายการอสังหาริมทรัพย์' : 'เพิ่มรายการอสังหาริมทรัพย์'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPropertyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveProperty} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium text-xs">รหัสทรัพย์</label>
                  <input
                    type="text"
                    value={propFormState.code || ''}
                    onChange={(e) =>
                      setPropFormState((prev) => ({ ...prev, code: e.target.value }))
                    }
                    placeholder="เช่น PROP-001 หรือ C-6601"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium text-xs">ประเภทอสังหาฯ *</label>
                  <select
                    value={propFormState.type || 'คอนโด'}
                    onChange={(e) =>
                      setPropFormState((prev) => ({
                        ...prev,
                        type: e.target.value as Property['type']
                      }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="คอนโด">คอนโด</option>
                    <option value="บ้านเดี่ยว">บ้านเดี่ยว</option>
                    <option value="ทาวน์โฮม">ทาวน์โฮม</option>
                    <option value="ที่ดิน">ที่ดิน</option>
                    <option value="อาคารพาณิชย์">อาคารพาณิชย์</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 font-medium text-xs">
                    หัวข้ออสังหาฯ / ชื่อโครงการ *
                  </label>
                  <input
                    type="text"
                    required
                    value={propFormState.title || ''}
                    onChange={(e) =>
                      setPropFormState((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="เช่น คอนโด M Jatujak 1 Bed 32 ตร.ม. ใกล้ BTS หมอชิต"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium text-xs">ประเภทธุรกรรม *</label>
                  <select
                    value={propFormState.dealType || 'ขาย'}
                    onChange={(e) =>
                      setPropFormState((prev) => ({
                        ...prev,
                        dealType: e.target.value as Property['dealType']
                      }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ขาย">ขาย</option>
                    <option value="ให้เช่า">ให้เช่า</option>
                    <option value="ขาย/เช่า">ขาย/เช่า</option>
                    <option value="ขายพร้อมผู้เช่า">ขายพร้อมผู้เช่า</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium text-xs">ราคา *</label>
                  <input
                    type="text"
                    required
                    value={propFormState.price || ''}
                    onChange={(e) =>
                      setPropFormState((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="เช่น 2.29 ล้านบาท หรือ 14,000/เดือน"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium text-xs">ทำเล / สถานีรถไฟฟ้า</label>
                  <input
                    type="text"
                    value={propFormState.location || ''}
                    onChange={(e) =>
                      setPropFormState((prev) => ({ ...prev, location: e.target.value }))
                    }
                    placeholder="เช่น จตุจักร / BTS หมอชิต / MRT จตุจักร"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium text-xs">ขนาดพื้นที่ / พท.ใช้สอย</label>
                  <input
                    type="text"
                    value={propFormState.size || ''}
                    onChange={(e) =>
                      setPropFormState((prev) => ({ ...prev, size: e.target.value }))
                    }
                    placeholder="เช่น 32 ตร.ม. หรือ 50 ตร.วา"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 font-medium text-xs">รายละเอียดห้อง / ชั้น</label>
                  <input
                    type="text"
                    value={propFormState.details || ''}
                    onChange={(e) =>
                      setPropFormState((prev) => ({ ...prev, details: e.target.value }))
                    }
                    placeholder="เช่น 1 นอน 1 น้ำ ชั้น 18"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 font-medium text-xs">ข้อมูลติดต่อ Agent *</label>
                  <input
                    type="text"
                    required
                    value={propFormState.contact || ''}
                    onChange={(e) =>
                      setPropFormState((prev) => ({ ...prev, contact: e.target.value }))
                    }
                    placeholder="เช่น โทร: 081-234-5678 (คุณเอ) / line id: @myrealestate"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 font-medium text-xs text-amber-600 dark:text-amber-400 flex items-center">
                    <i className="fa-solid fa-user-lock mr-1.5"></i>
                    <span>
                      ข้อมูลติดต่อเจ้าของทรัพย์ (ใช้ภายในระบบเท่านั้น - ไม่แสดงในแคปชั่น)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={propFormState.ownerContact || ''}
                    onChange={(e) =>
                      setPropFormState((prev) => ({ ...prev, ownerContact: e.target.value }))
                    }
                    placeholder="เช่น คุณสมชาย (เจ้าของห้อง) โทร 081-999-8888 / Line: somchai_owner"
                    className="w-full bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/60 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 font-medium text-xs text-sky-600 dark:text-sky-400 flex items-center">
                    <i className="fa-solid fa-link mr-1.5"></i>
                    <span>โพสต์เจ้าของทรัพย์ (URL ที่เจ้าของโพสต์ทรัพย์ไว้ - ไม่แสดงในแคปชั่น)</span>
                  </label>
                  <input
                    type="url"
                    value={propFormState.sourceUrl || ''}
                    onChange={(e) =>
                      setPropFormState((prev) => ({ ...prev, sourceUrl: e.target.value }))
                    }
                    placeholder="เช่น https://www.facebook.com/groups/xxx/posts/123456789"
                    className="w-full bg-sky-50/40 dark:bg-sky-950/20 border border-sky-300 dark:border-sky-800/60 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 font-medium text-xs">
                    Path ที่เก็บรูปภาพในเครื่อง (Folder Image Path)
                  </label>
                  <input
                    type="text"
                    value={propFormState.imgFolderPath || ''}
                    onChange={(e) =>
                      setPropFormState((prev) => ({ ...prev, imgFolderPath: e.target.value }))
                    }
                    placeholder="เช่น C:\Photos\Condo_MJatujak หรือ D:\RealEstate\Project1"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 font-medium text-xs">
                    รูปภาพพรีวิว (URL หรือ อัปโหลดจากเครื่อง)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                    <input
                      type="text"
                      value={propFormState.imgUrl || ''}
                      onChange={(e) =>
                        setPropFormState((prev) => ({ ...prev, imgUrl: e.target.value }))
                      }
                      placeholder="วาง URL รูปภาพ หรือ กดปุ่มอัปโหลดจากเครื่อง..."
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="cursor-pointer bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium px-4 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shrink-0 shadow-sm">
                      <i className="fa-solid fa-upload text-blue-500"></i>
                      <span>เลือกรูปจากเครื่อง</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {propFormState.imgUrl && (
                    <div className="mt-3">
                      <p className="text-[11px] text-slate-400 mb-1">ตัวอย่างรูปภาพ:</p>
                      <div className="relative w-32 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                        <img
                          src={propFormState.imgUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 font-medium text-xs">
                    รายละเอียดเพิ่มเติม / จุดเด่นแคปชั่น
                  </label>
                  <textarea
                    rows={4}
                    value={propFormState.description || ''}
                    onChange={(e) =>
                      setPropFormState((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="เฟอร์นิเจอร์ เครื่องใช้ไฟฟ้า สิ่งอำนวยความสะดวก ส่วนกลาง ฯลฯ"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsPropertyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT FB GROUP ================= */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-lg">
                {editingGroup ? 'แก้ไขกลุ่ม Facebook' : 'เพิ่มกลุ่ม Facebook'}
              </h3>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4 text-sm">
              <div>
                <label className="block mb-1 font-medium text-xs">ชื่อกลุ่ม Facebook *</label>
                <input
                  type="text"
                  required
                  value={groupFormState.name || ''}
                  onChange={(e) =>
                    setGroupFormState((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="เช่น ซื้อขายคอนโดติดรถไฟฟ้า BTS/MRT"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-xs">URL กลุ่ม Facebook *</label>
                <input
                  type="url"
                  required
                  value={groupFormState.url || ''}
                  onChange={(e) =>
                    setGroupFormState((prev) => ({ ...prev, url: e.target.value }))
                  }
                  placeholder="https://www.facebook.com/groups/..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-xs">หมวดหมู่กลุ่ม *</label>
                <select
                  value={groupFormState.category || 'คอนโด'}
                  onChange={(e) =>
                    setGroupFormState((prev) => ({
                      ...prev,
                      category: e.target.value as FBGroup['category']
                    }))
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="คอนโด">กลุ่มคอนโด</option>
                  <option value="บ้านเดี่ยว/ทาวน์โฮม">กลุ่มบ้าน/ทาวน์โฮม</option>
                  <option value="ทั่วไป/ซื้อขายอสังหา">กลุ่มอสังหาฯ ทั่วไป</option>
                  <option value="ทำเลเฉพาะ">กลุ่มรายทำเล/พื้นที่</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium text-xs">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  value={groupFormState.note || ''}
                  onChange={(e) =>
                    setGroupFormState((prev) => ({ ...prev, note: e.target.value }))
                  }
                  placeholder="เช่น สมาชิก 120k, อนุมัติไว"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md cursor-pointer"
                >
                  บันทึกกลุ่ม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT HISTORY LINK ================= */}
      {editingHistoryItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-lg flex items-center text-slate-900 dark:text-white">
                <i className="fa-solid fa-link text-blue-500 mr-2"></i> แก้ไข Link โพสต์ (Posted
                Link)
              </h3>
              <button
                type="button"
                onClick={() => setEditingHistoryItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSaveEditHistory} className="space-y-4 text-sm">
              <div>
                <label className="block mb-1 font-medium text-xs text-slate-700 dark:text-slate-300">
                  URL โพสต์ Facebook *
                </label>
                <input
                  type="url"
                  required
                  value={editHistoryUrl}
                  onChange={(e) => setEditHistoryUrl(e.target.value)}
                  placeholder="https://www.facebook.com/groups/..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingHistoryItem(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-xs cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs shadow-md cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CAPTION PREVIEW ================= */}
      {captionModalText !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-lg flex items-center">
                <i className="fa-regular fa-copy text-blue-500 mr-2"></i> ตัวอย่างแคปชั่นสำหรับคัดลอก
              </h3>
              <button
                type="button"
                onClick={() => setCaptionModalText(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <textarea
              rows={12}
              readOnly
              value={captionModalText}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-mono leading-relaxed outline-none resize-none"
            />
            <div className="flex justify-between items-center pt-2">
              <span
                className={`text-xs text-emerald-500 font-semibold transition-opacity ${
                  isCaptionCopied ? 'opacity-100' : 'opacity-0'
                }`}
              >
                คัดลอกลง Clipboard แล้ว!
              </span>
              <button
                type="button"
                onClick={handleCopyCaption}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md flex items-center space-x-2 cursor-pointer"
              >
                <i className="fa-regular fa-copy"></i>
                <span>กดคัดลอกแคปชั่น</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: USER LOGIN & PROFILE ================= */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-lg flex items-center">
                <i className="fa-solid fa-user-gear text-blue-500 mr-2"></i> บัญชีผู้ใช้งานระบบ
              </h3>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <p className="text-xs text-slate-400">เข้าสู่ระบบในชื่อ:</p>
              <p className="font-bold text-sm text-blue-600 dark:text-blue-400">
                {appState.settings.agentName || 'ผู้ใช้งานระบบ'}
              </p>
              <p className="text-[10px] font-mono text-slate-400">สถานะ: Local Active & Synced</p>
            </div>

            <form onSubmit={handleSwitchUser} className="space-y-3">
              <label className="block font-medium text-xs">
                สลับเข้าใช้งานด้วยชื่อผู้ใช้ใหม่ (Multi-User):
              </label>
              <input
                type="text"
                required
                value={newUserNameInput}
                onChange={(e) => setNewUserNameInput(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้ เช่น Agent_Somchai"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs transition shadow-md flex items-center justify-center space-x-2 cursor-pointer"
              >
                <i className="fa-solid fa-right-to-bracket"></i>
                <span>เปลี่ยนผู้ใช้งานระบบ</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRMATION DIALOG ================= */}
      {confirmModalData.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center text-xl">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {confirmModalData.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {confirmModalData.message}
              </p>
            </div>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setConfirmModalData((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModalData.onConfirm();
                  setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium transition shadow-md cursor-pointer"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: UPGRADE & ACTIVATION ================= */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        deviceId={deviceId}
        isActivated={isActivated}
        licenseInfo={appState.license}
        onActivate={handleActivateLicense}
        contactLine="@828ehqct"
        lineLinkUrl="https://lin.ee/QbEeYc7"
      />

      {/* ================= MODAL: SELLER KEY GENERATOR (ADMIN ONLY) ================= */}
      <SellerKeygenModal
        isOpen={isSellerModalOpen}
        onClose={() => setIsSellerModalOpen(false)}
        currentDeviceId={deviceId}
        onResetCurrentDeviceToTrial={handleResetTrial}
      />

      {/* ================= OFFLINE INDICATOR ================= */}
      <OfflineIndicator />

      {/* ================= FLOATING TOAST NOTIFICATIONS ================= */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => {
          const bg =
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900';
          const icon =
            toast.type === 'success'
              ? 'fa-circle-check'
              : toast.type === 'error'
              ? 'fa-circle-exclamation'
              : 'fa-circle-info';
          return (
            <div
              key={toast.id}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg text-xs font-medium transition-all duration-300 pointer-events-auto ${bg}`}
            >
              <i className={`fa-solid ${icon}`}></i>
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
