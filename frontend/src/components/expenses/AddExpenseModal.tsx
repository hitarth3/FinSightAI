import React, { useState, useEffect } from 'react';
import { GlassModal } from '../ui/GlassModal';
import { ManualExpenseForm } from './ManualExpenseForm';
import { ReceiptUploadForm } from './ReceiptUploadForm';
import { BankStatementImportForm } from './BankStatementImportForm';
import { Sparkles, FileText } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'upload' | 'statement'>('manual');
  const [modalSize, setModalSize] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('md');
  // Increment this key each time we need to force-remount the statement form
  // (on tab switch OR on modal open) so stale upload state is always cleared.
  const [statementKey, setStatementKey] = useState(0);

  // Every time the modal opens, reset to default tab and bump the key so any
  // lingering upload state inside BankStatementImportForm is fully destroyed.
  useEffect(() => {
    if (isOpen) {
      setActiveTab('manual');
      setModalSize('md');
      setStatementKey((k) => k + 1);
    }
  }, [isOpen]);

  const handleTabChange = (tab: 'manual' | 'upload' | 'statement') => {
    setActiveTab(tab);
    setModalSize('md');
    // Bump key whenever user switches TO the statement tab so a fresh form mounts
    if (tab === 'statement') setStatementKey((k) => k + 1);
  };

  const handleStateChange = (state: 'upload' | 'review') => {
    setModalSize(state === 'review' ? '2xl' : 'md');
  };

  const handleClose = () => {
    setModalSize('md');
    setActiveTab('manual');
    onClose();
  };

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} title="Add New Expense" size={modalSize}>
      <div className="flex flex-col gap-6">
        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-[var(--surface-subtle)] p-1 border border-[var(--border-color)]">
          <button
            onClick={() => handleTabChange('manual')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all duration-300 ${
              activeTab === 'manual'
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]/70'
            }`}
          >
            Add Manually
          </button>

          <button
            onClick={() => handleTabChange('upload')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]/70'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--primary-color)]" />
            Upload Receipt
          </button>

          <button
            onClick={() => handleTabChange('statement')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'statement'
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]/70'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[var(--primary-color)]" />
            Bank Statement
          </button>
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'manual' && <ManualExpenseForm onSuccess={handleClose} />}
          {activeTab === 'upload' && <ReceiptUploadForm onSuccess={handleClose} />}
          {activeTab === 'statement' && (
            <BankStatementImportForm
              key={statementKey}
              onSuccess={handleClose}
              onStateChange={handleStateChange}
            />
          )}
        </div>
      </div>
    </GlassModal>
  );
};
export default AddExpenseModal;
