import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Inbox,
} from 'lucide-react';

/**
 * Modal กลางของหน้าหลังบ้าน
 *
 * ทำไมต้องมีตัวนี้: modal ในระบบเดิมเขียนซ้ำกันทุกหน้า (markup ชุดเดียวกัน copy ไปมา)
 * และไม่มี focus trap / ESC / คืน focus เลย ตัวนี้รวมพฤติกรรมทั้งหมดไว้ที่เดียว
 *
 * หมายเหตุเรื่องแอนิเมชัน: โปรเจกต์ไม่ได้ติดตั้ง tailwindcss-animate
 * class อย่าง animate-in / zoom-in-95 ที่ใช้อยู่เดิมจึงไม่มีผลอะไร
 * ที่นี่ใช้ keyframes จริงใน App.css แทน (.dcms-modal-*)
 *
 * ธีมสว่างอย่างเดียวตามทั้งระบบ ไม่มี dark mode
 */

export type ModalVariant = 'default' | 'info' | 'success' | 'warning' | 'error';

/** กว้างสุดตามเนื้อหา — full ไว้ให้ฟอร์มที่มีสองคอลัมน์จริง ๆ เท่านั้น */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-[480px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[640px]',
  xl: 'max-w-[720px]',
  full: 'max-w-5xl',
};

/**
 * โทนสีต่อ variant
 * - accent   แถบบางบนสุดของ modal บอกประเภทตั้งแต่แรกเห็น
 * - tint     ไล่สีจาง ๆ ของ header ไม่ให้เป็นแผ่นขาวโล่ง
 * - glow     วงกลมเบลอหลังไอคอน เพิ่มมิติให้หัว modal
 */
const VARIANTS: Record<
  ModalVariant,
  {
    icon: React.ElementType;
    iconClass: string;
    ring: string;
    accent: string;
    tint: string;
    glow: string;
  }
> = {
  default: {
    icon: Info,
    iconClass: 'text-primary bg-white',
    ring: 'ring-primary/10',
    accent: 'from-primary via-primary/90 to-primary/50',
    tint: 'from-primary/[0.10] via-primary/[0.04] to-transparent',
    glow: 'bg-primary/20',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-600 bg-white',
    ring: 'ring-blue-500/10',
    accent: 'from-blue-600 via-blue-500/90 to-blue-400/50',
    tint: 'from-blue-500/[0.10] via-blue-500/[0.04] to-transparent',
    glow: 'bg-blue-400/25',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-600 bg-white',
    ring: 'ring-emerald-500/10',
    accent: 'from-emerald-600 via-emerald-500/90 to-emerald-400/50',
    tint: 'from-emerald-500/[0.10] via-emerald-500/[0.04] to-transparent',
    glow: 'bg-emerald-400/25',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600 bg-white',
    ring: 'ring-amber-500/10',
    accent: 'from-amber-500 via-amber-400/90 to-amber-300/50',
    tint: 'from-amber-500/[0.12] via-amber-500/[0.04] to-transparent',
    glow: 'bg-amber-400/25',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-rose-600 bg-white',
    ring: 'ring-rose-500/10',
    accent: 'from-rose-600 via-rose-500/90 to-rose-400/50',
    tint: 'from-rose-500/[0.10] via-rose-500/[0.04] to-transparent',
    glow: 'bg-rose-400/25',
  },
};

export interface ModalAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** ปุ่มหลักที่เป็นการกระทำอันตราย (ลบ) ใช้ danger */
  tone?: 'primary' | 'danger';
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;

  title: string;
  subtitle?: string;
  /** ใส่ไอคอนเองได้ ถ้าไม่ใส่จะใช้ไอคอนตาม variant */
  icon?: React.ElementType;
  variant?: ModalVariant;
  size?: ModalSize;

  /** คลิกพื้นหลังเพื่อปิด — ปิดไว้เมื่อฟอร์มมีข้อมูลที่ยังไม่ได้บันทึก */
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;

  /** true = แสดง skeleton แทนเนื้อหา */
  loading?: boolean;
  /** ข้อความ error แสดงเป็นแถบด้านบนของเนื้อหา */
  error?: string | null;

  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  /** ลิงก์ข้อความในแถบล่าง เช่น "ดูคู่มือ" */
  textLink?: { label: string; onClick: () => void };
  /** ถ้าอยากคุม footer เองทั้งหมด ใส่ตรงนี้แทน primary/secondary */
  footer?: React.ReactNode;

  children: React.ReactNode;
}

/** องค์ประกอบที่โฟกัสได้ ใช้ทำ focus trap */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  variant = 'default',
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  loading = false,
  error = null,
  primaryAction,
  secondaryAction,
  textLink,
  footer,
  children,
}) => {
  // ต้องคง DOM ไว้จนแอนิเมชันปิดจบ ไม่งั้นมันหายวับไม่มีจังหวะออก
  //
  // ปรับ state ตอน render ตาม pattern "Adjusting state when a prop changes" ของ React
  // แทนที่จะ setState ใน useEffect ซึ่งทำให้ render ซ้อน
  // และเลิก mount ด้วย onAnimationEnd แทนตั้ง setTimeout ตายตัว
  // จะได้ตรงกับ animation จริงเสมอแม้ผู้ใช้ตั้ง prefers-reduced-motion ไว้
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(isOpen);

  if (prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    setClosing(!isOpen && prevOpen);
  }

  const mounted = isOpen || closing;

  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // จำ element ที่โฟกัสอยู่ก่อนเปิด แล้วคืนโฟกัสให้ตอนปิด
  // ไม่งั้นผู้ใช้คีย์บอร์ดจะหลุดไปต้นหน้าทุกครั้งที่ปิด modal
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement;

    const focusFirst = () => {
      const el = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (el ?? panelRef.current)?.focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    return () => {
      cancelAnimationFrame(raf);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  // ล็อกไม่ให้หน้าด้านหลังเลื่อนตาม
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      // focus trap: วนอยู่ในกรอบ modal ไม่หลุดไปหน้าเบื้องหลัง
      const items = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
      ).filter(el => el.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [closeOnEsc, onClose]
  );

  if (!mounted) return null;

  const v = VARIANTS[variant];
  const Icon = icon ?? v.icon;
  const state = closing ? 'closing' : 'open';
  const titleId = 'dcms-modal-title';
  const descId = subtitle ? 'dcms-modal-subtitle' : undefined;

  const hasDefaultFooter = !!(primaryAction || secondaryAction || textLink);

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6"
      onKeyDown={handleKeyDown}
    >
      {/* ฉากหลัง */}
      <div
        className={`dcms-modal-overlay dcms-modal-overlay--${state} absolute inset-0 bg-slate-900/60 backdrop-blur-sm`}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onAnimationEnd={e => {
          // animation ของไอคอนข้างในก็ bubble ขึ้นมา รับเฉพาะของกรอบตัวเอง
          if (e.target !== e.currentTarget) return;
          if (closing) setClosing(false);
        }}
        className={`dcms-modal-panel dcms-modal-panel--${state} relative w-full ${SIZES[size]}
                    max-h-[calc(100dvh-2rem)] sm:max-h-[90dvh]
                    flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl
                    ring-1 ring-black/5 outline-none`}
      >
        {/* แถบบางบนสุด บอกประเภท modal ตั้งแต่แรกเห็นโดยไม่ต้องอ่านข้อความ */}
        <div
          className={`h-1 w-full flex-shrink-0 bg-gradient-to-r ${v.accent}`}
          aria-hidden="true"
        />

        {/* ---------- Header ---------- */}
        <header
          className={`relative flex-shrink-0 overflow-hidden border-b border-gray-100
                      bg-gradient-to-br ${v.tint}`}
        >
          {/* วงกลมเบลอหลังไอคอน ให้หัวมีมิติแทนที่จะเป็นแผ่นสีเรียบ */}
          <div
            className={`pointer-events-none absolute -left-8 -top-14 h-36 w-36 rounded-full
                        blur-3xl opacity-60 ${v.glow}`}
            aria-hidden="true"
          />
          {/* ลายเส้นทแยงฝั่งขวา ที่ที่ไม่มีข้อความ */}
          <div
            className="dcms-modal-header-deco pointer-events-none absolute inset-y-0 right-0 w-1/2"
            aria-hidden="true"
          />

          <div className="relative flex items-start gap-4 px-6 py-5">
            <div
              className={`dcms-modal-icon flex-shrink-0 grid place-items-center
                          w-11 h-11 rounded-xl shadow-sm ring-4 ${v.ring} ${v.iconClass}`}
            >
              <Icon size={20} strokeWidth={2} aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id={titleId}
                className="text-lg font-bold text-gray-800 leading-snug truncate"
              >
                {title}
              </h2>
              {subtitle && (
                <p
                  id={descId}
                  className="text-sm text-gray-500 mt-1 leading-relaxed"
                >
                  {subtitle}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่าง"
              className="dcms-modal-close flex-shrink-0 grid place-items-center h-9 w-9 rounded-lg
                         bg-white/70 text-gray-400 ring-1 ring-black/5 backdrop-blur-sm
                         hover:bg-white hover:text-gray-600 hover:ring-black/10 active:scale-95
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                         transition-all duration-200"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ---------- Body ---------- */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div
              role="alert"
              className="dcms-modal-alert mb-4 flex items-start gap-2.5 rounded-xl border
                         border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
            >
              <XCircle size={17} className="mt-px flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {loading ? <ModalSkeleton /> : children}
        </div>

        {/* ---------- Footer ----------
            พื้นเทาอ่อนกว่า body ทำให้แถบปุ่มดู "จม" ลงไปหนึ่งชั้น
            สายตาแยกโซนเนื้อหากับโซนตัดสินใจออกจากกันได้ทันที */}
        {(footer || hasDefaultFooter) && (
          <footer
            className="relative flex-shrink-0 border-t border-gray-100 px-6 py-4
                       bg-gradient-to-b from-gray-50/80 to-gray-100/60"
          >
            {/* เส้นสว่างบาง ๆ ใต้ขอบบน ช่วยให้รอยต่อดูคมขึ้นแบบ inset */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80"
              aria-hidden="true"
            />
            {footer ?? (
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                {textLink && (
                  <button
                    type="button"
                    onClick={textLink.onClick}
                    className="text-sm font-medium text-gray-500 hover:text-primary
                               underline-offset-4 hover:underline transition-colors duration-200"
                  >
                    {textLink.label}
                  </button>
                )}

                <div className="sm:ml-auto flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                  {secondaryAction && (
                    <ModalButton action={secondaryAction} kind="secondary" />
                  )}
                  {primaryAction && <ModalButton action={primaryAction} kind="primary" />}
                </div>
              </div>
            )}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
};

/* ------------------------------------------------------------------ */

const ModalButton: React.FC<{ action: ModalAction; kind: 'primary' | 'secondary' }> = ({
  action,
  kind,
}) => {
  const busy = !!action.loading;
  const disabled = !!action.disabled || busy;

  const base =
    'dcms-modal-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl ' +
    'font-bold text-sm transition-all duration-200 w-full sm:w-auto ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

  const tone =
    kind === 'secondary'
      ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 focus-visible:ring-gray-300'
      : action.tone === 'danger'
      ? 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:ring-rose-500'
      : 'bg-primary text-white shadow-sm hover:opacity-90 focus-visible:ring-primary';

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={disabled}
      aria-busy={busy}
      className={`${base} ${tone}`}
    >
      {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {action.label}
    </button>
  );
};

/** โครงหลอกระหว่างโหลด — ให้ความรู้สึกว่าเนื้อหากำลังมา ไม่ใช่ค้าง */
export const ModalSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-4" aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="dcms-skeleton h-3 w-24 rounded" />
        <div className="dcms-skeleton h-10 w-full rounded-xl" />
      </div>
    ))}
    <span className="sr-only">กำลังโหลดข้อมูล</span>
  </div>
);

/** สถานะว่าง — ใช้เมื่อไม่มีข้อมูลให้แสดง */
export const ModalEmptyState: React.FC<{
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon: Icon = Inbox, title, description, action }) => (
  <div className="py-12 text-center">
    <div
      className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full
                 bg-gray-50 text-gray-300"
    >
      <Icon size={30} aria-hidden="true" />
    </div>
    <h4 className="text-base font-bold text-gray-500">{title}</h4>
    {description && (
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/** หัวข้อกลุ่มฟิลด์ในเนื้อหา modal — คุมระยะห่างให้เท่ากันทุกที่ */
export const ModalSection: React.FC<{
  title?: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="space-y-4">
    {(title || description) && (
      <div>
        {title && (
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-1 text-xs text-gray-400">{description}</p>
        )}
      </div>
    )}
    {children}
  </section>
);

export default Modal;
