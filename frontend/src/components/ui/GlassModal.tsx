import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface GlassModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/** Native dialogs provide focus containment, Escape handling and focus restoration. */
export function GlassModal({ isOpen, onClose, title, children, className, size = 'md' }: GlassModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!isOpen || !dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, [isOpen]);
  if (!isOpen) return null;
  return createPortal(<dialog ref={ref} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose?.(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose?.(); }}
    className={cn('finance-dialog', { 'max-w-md': size === 'sm', 'max-w-xl': size === 'md', 'max-w-3xl': size === 'lg', 'max-w-5xl': size === 'xl', 'max-w-7xl': size === '2xl' })}>
    <div className={cn('p-6 md:p-8', className)}><div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-color)]"><h2 id={titleId} className="text-xl font-semibold tracking-tight">{title}</h2>{onClose && <button type="button" className="icon-btn" aria-label="Close modal" onClick={onClose}><X size={20} /></button>}</div>{children}</div>
  </dialog>, document.body);
}
