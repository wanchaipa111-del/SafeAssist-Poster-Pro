import React, { useState } from 'react';
import { LicenseInfo } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  isActivated: boolean;
  licenseInfo?: LicenseInfo;
  onActivate: (key: string) => boolean;
  contactLine?: string;
  lineLinkUrl?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  deviceId,
  isActivated,
  licenseInfo,
  onActivate,
  contactLine = '@828ehqct',
  lineLinkUrl = 'https://lin.ee/QbEeYc7',
}) => {
  const [inputKey, setInputKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const success = onActivate(inputKey.trim());
    if (!success) {
      setErrorMessage('รหัส License Key ไม่ถูกต้อง กรุณาตรวจสอบหรือติดต่อผู้จำหน่าย');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
              <i className="fa-solid fa-crown text-xl"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                {isActivated ? 'สถานะสิทธิ์การใช้งาน (Lifetime VIP)' : 'ปลดล็อกเวอร์ชันเต็มตลอดชีพ'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                SafeAssist Poster Pro - Full License Activation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer p-1"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* ALREADY ACTIVATED VIEW */}
        {isActivated ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto text-xl shadow-md shadow-emerald-500/30">
                <i className="fa-solid fa-check"></i>
              </div>
              <h4 className="font-bold text-base text-emerald-800 dark:text-emerald-300">
                เปิดใช้งานเวอร์ชันเต็ม Lifetime VIP แล้ว
              </h4>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                คุณสามารถเพิ่มรายการอสังหาริมทรัพย์และนำเข้าไฟล์ Excel ได้ไม่จำกัดตลอดชีพ
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500">รหัสเครื่อง (Device ID):</span>
                <span className="font-mono font-bold">{deviceId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500">License Key:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {licenseInfo?.licenseKey || 'SA-VIP-LIFETIME'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">วันที่เปิดใช้งาน:</span>
                <span>
                  {licenseInfo?.activatedAt
                    ? new Date(licenseInfo.activatedAt).toLocaleDateString('th-TH')
                    : 'ตลอดชีพ'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        ) : (
          /* TRIAL LIMITATION & ACTIVATION VIEW */
          <div className="space-y-5">
            {/* Value Proposition Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>เวอร์ชันทดลองใช้ฟรี</span>
                </div>
                <ul className="space-y-1.5 text-slate-500 dark:text-slate-400">
                  <li className="flex items-center text-rose-500 font-semibold">
                    <i className="fa-solid fa-triangle-exclamation mr-1.5 text-[10px]"></i>
                    จำกัดสูงสุด 2 ทรัพย์
                  </li>
                  <li className="flex items-center">
                    <i className="fa-solid fa-check mr-1.5 text-emerald-500 text-[10px]"></i>
                    ลองรันโพสต์ Semi-Auto ได้
                  </li>
                  <li className="flex items-center">
                    <i className="fa-solid fa-check mr-1.5 text-emerald-500 text-[10px]"></i>
                    สร้างแคปชั่นอัตโนมัติ
                  </li>
                </ul>
              </div>

              <div className="p-3.5 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 rounded-2xl border border-amber-300 dark:border-amber-700/60 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-amber-700 dark:text-amber-300">
                  <i className="fa-solid fa-crown text-amber-500"></i>
                  <span>เวอร์ชันเต็ม (Lifetime VIP)</span>
                </div>
                <ul className="space-y-1.5 text-slate-700 dark:text-slate-200">
                  <li className="flex items-center font-bold text-emerald-600 dark:text-emerald-400">
                    <i className="fa-solid fa-circle-check mr-1.5 text-emerald-500 text-[10px]"></i>
                    บันทึกทรัพย์ได้ไม่จำกัด
                  </li>
                  <li className="flex items-center font-semibold">
                    <i className="fa-solid fa-circle-check mr-1.5 text-emerald-500 text-[10px]"></i>
                    นำเข้าไฟล์ Excel ไม่อั้น
                  </li>
                  <li className="flex items-center font-semibold">
                    <i className="fa-solid fa-circle-check mr-1.5 text-emerald-500 text-[10px]"></i>
                    ซื้อขาดครั้งเดียว ไม่มีรายเดือน
                  </li>
                  <li className="flex items-center font-semibold">
                    <i className="fa-solid fa-circle-check mr-1.5 text-emerald-500 text-[10px]"></i>
                    อัปเดตฟรีตลอดชีพ
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 1: Device ID */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                ขั้นตอนที่ 1: รหัสประจำเครื่องของคุณ (Device ID)
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono text-sm font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                  {deviceId}
                </div>
                <button
                  type="button"
                  onClick={handleCopyDeviceId}
                  className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <i className={`fa-regular ${isCopied ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                  <span>{isCopied ? 'คัดลอกแล้ว' : 'คัดลอกรหัส'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                👉 กดคัดลอกรหัสนี้แล้วส่งให้กับผู้ขาย เพื่อรับรหัสปลดล็อกสิทธิ์ใช้งานตลอดชีพ
              </p>
            </div>

            {/* Step 2: Contact Info */}
            <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-2xl text-xs space-y-2">
              <p className="font-bold text-blue-700 dark:text-blue-300 flex items-center">
                <i className="fa-solid fa-circle-info mr-1.5"></i>
                ขั้นตอนที่ 2: ช่องทางติดต่อสั่งซื้อ License Key
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center space-x-2.5">
                  <i className="fa-brands fa-line text-[#06C755] text-2xl"></i>
                  <div>
                    <span className="text-slate-400 text-[11px] block">LINE Official:</span>
                    <strong className="text-slate-800 dark:text-white font-mono text-sm tracking-wide">
                      {contactLine}
                    </strong>
                  </div>
                </div>
                <a
                  href={lineLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-sm shadow-[#06C755]/20 cursor-pointer"
                >
                  <i className="fa-brands fa-line text-sm"></i>
                  <span>กดเพิ่มเพื่อน LINE (หรือคลิกที่นี่)</span>
                </a>
              </div>
            </div>

            {/* Step 3: Activation Form */}
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  ขั้นตอนที่ 3: กรอกรหัสเปิดใช้งาน (License Key) ที่ได้รับ:
                </label>
                <input
                  type="text"
                  required
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value.toUpperCase());
                    setErrorMessage('');
                  }}
                  placeholder="เช่น SA-VIP-XXXX-YYYY-ZZZZ"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-sm tracking-wider uppercase outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-500 font-semibold flex items-center">
                  <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center space-x-2 text-sm cursor-pointer"
              >
                <i className="fa-solid fa-unlock-keyhole"></i>
                <span>ยืนยันและเปิดใช้งานตลอดชีพ (Activate VIP)</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
