import React, { useState } from 'react';
import { generateLicenseKey, ADMIN_MASTER_PIN } from '../utils/license';

interface SellerKeygenModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDeviceId: string;
  onResetCurrentDeviceToTrial?: () => void;
}

export const SellerKeygenModal: React.FC<SellerKeygenModalProps> = ({
  isOpen,
  onClose,
  currentDeviceId,
  onResetCurrentDeviceToTrial,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState('');
  
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copiedMessage, setCopiedMessage] = useState('');

  if (!isOpen) return null;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_MASTER_PIN) {
      setIsAuthenticated(true);
      setPinError('');
      // Pre-fill target with current device if empty
      const initialId = targetDeviceId || currentDeviceId;
      setTargetDeviceId(initialId);
      setGeneratedKey(generateLicenseKey(initialId));
    } else {
      setPinError('รหัส PIN ไม่ถูกต้อง (เฉพาะเจ้าของระบบเท่านั้น)');
    }
  };

  const handleDeviceIdChange = (val: string) => {
    const upper = val.toUpperCase();
    setTargetDeviceId(upper);
    if (upper.trim()) {
      setGeneratedKey(generateLicenseKey(upper.trim()));
    } else {
      setGeneratedKey('');
    }
  };

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = targetDeviceId.trim().toUpperCase();
    if (!cleanId) return;
    const key = generateLicenseKey(cleanId);
    setGeneratedKey(key);
  };

  const copyToClipboard = (text: string, successMsg: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          setCopiedMessage(successMsg);
          setTimeout(() => setCopiedMessage(''), 3000);
        }).catch(() => {
          fallbackCopy(text, successMsg);
        });
      } else {
        fallbackCopy(text, successMsg);
      }
    } catch {
      fallbackCopy(text, successMsg);
    }
  };

  const fallbackCopy = (text: string, successMsg: string) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopiedMessage(successMsg);
    setTimeout(() => setCopiedMessage(''), 3000);
  };

  const handleCopyOnlyKey = () => {
    const cleanId = targetDeviceId.trim().toUpperCase();
    const keyToCopy = generatedKey || generateLicenseKey(cleanId);
    if (!keyToCopy) return;
    copyToClipboard(keyToCopy, `คัดลอก License Key สำเร็จ: ${keyToCopy}`);
  };

  const handleCopyCustomerMessage = () => {
    const cleanId = targetDeviceId.trim().toUpperCase();
    const keyToCopy = generatedKey || generateLicenseKey(cleanId);
    if (!keyToCopy) return;

    const msg = `🎉 ขอบคุณสำหรับการสั่งซื้อ SafeAssist Poster Pro เวอร์ชันเต็ม (Lifetime VIP)!

📱 รหัสเครื่องของคุณ: ${cleanId}
🔑 License Key ปลดล็อกตลอดชีพ:
${keyToCopy}

วิธีเปิดใช้งาน:
1. เปิดแอป SafeAssist Poster Pro
2. คลิกปุ่ม "ปลดล็อกเวอร์ชันเต็ม" (ป้ายสีส้มทองมุมบนขวา)
3. นำ License Key ด้านบนไปวางในขั้นตอนที่ 3 แล้วกด "ยืนยันและเปิดใช้งาน"
ระบบจะปลดล็อกให้บันทึกทรัพย์และนำเข้า Excel ได้ไม่จำกัดตลอดชีพทันทีครับ!`;

    copyToClipboard(msg, 'คัดลอกข้อความพร้อมส่งให้ลูกค้าทาง LINE เรียบร้อยแล้ว!');
  };

  const handleClose = () => {
    setPinInput('');
    setPinError('');
    setIsAuthenticated(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <i className="fa-solid fa-key text-base"></i>
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Seller License Generator (ระบบออกคีย์ลับของผู้ขาย)
              </h3>
              <p className="text-[11px] text-slate-400">
                เครื่องมือสร้าง License Key ประจำเครื่องสำหรับลูกค้า
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 text-lg cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {!isAuthenticated ? (
          /* STEP 1: PIN AUTHENTICATION */
          <form onSubmit={handleVerifyPin} className="space-y-4 py-2">
            <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1 text-xs">
              <p className="font-semibold text-amber-400 flex items-center">
                <i className="fa-solid fa-shield-halved mr-1.5"></i>
                ระบบรักษาความปลอดภัยเฉพาะผู้ดูแลระบบ
              </p>
              <p className="text-slate-400">
                กรุณากรอก Master Admin PIN 6 หลัก เพื่อเข้าใช้งานเครื่องมือออก License Key
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Admin PIN:
              </label>
              <input
                type="password"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="กรอก PIN 6 หลัก"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-center font-mono text-lg tracking-widest text-amber-400 outline-none focus:ring-2 focus:ring-amber-500"
              />
              {pinError && (
                <p className="text-rose-400 text-xs font-medium mt-1 flex items-center">
                  <i className="fa-solid fa-circle-exclamation mr-1"></i> {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              เข้าสู่ระบบเครื่องมือออกคีย์
            </button>
          </form>
        ) : (
          /* STEP 2: KEY GENERATOR TOOL */
          <div className="space-y-4">
            <form onSubmit={handleGenerateKey} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">
                    วางรหัสเครื่องของลูกค้า (Customer Device ID):
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeviceIdChange(currentDeviceId)}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    ใช้รหัสเครื่องนี้ ({currentDeviceId})
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={targetDeviceId}
                  onChange={(e) => handleDeviceIdChange(e.target.value)}
                  placeholder="เช่น SA-9482-B721"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 font-mono text-sm uppercase tracking-wider text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span>คำนวณ License Key</span>
              </button>
            </form>

            {generatedKey && (
              <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-amber-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block">
                    License Key ประจำเครื่อง:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {targetDeviceId}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-sm font-extrabold text-amber-400 select-all tracking-wider text-center">
                  {generatedKey}
                </div>

                {/* Two copy buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyOnlyKey}
                    className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 border border-slate-600"
                  >
                    <i className="fa-solid fa-key text-amber-400"></i>
                    <span>คัดลอกเฉพาะ Key</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCustomerMessage}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/30"
                  >
                    <i className="fa-brands fa-line text-sm"></i>
                    <span>คัดลอกข้อความส่ง LINE</span>
                  </button>
                </div>

                {copiedMessage && (
                  <p className="text-emerald-400 text-[11px] font-semibold text-center mt-1 animate-pulse">
                    <i className="fa-solid fa-check mr-1"></i> {copiedMessage}
                  </p>
                )}
              </div>
            )}

            {onResetCurrentDeviceToTrial && (
              <div className="pt-2 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    onResetCurrentDeviceToTrial();
                    handleClose();
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 transition underline cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-rotate-left mr-1"></i>
                  รีเซ็ตเครื่องนี้กลับเป็นเวอร์ชันทดลอง (สำหรับผู้ขายทดสอบ)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
