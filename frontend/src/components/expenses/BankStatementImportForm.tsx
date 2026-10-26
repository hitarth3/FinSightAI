import React, { useState, useRef, useEffect } from 'react';
import { expenseService } from '../../services/expenseService';
import { useToasts } from '../../context/ToastContext';
import { UploadCloud, RefreshCw, AlertCircle, FileText, Building2, CheckCircle2, ChevronRight } from 'lucide-react';
import { BankStatementReview } from './BankStatementReview';

interface BankStatementImportFormProps {
  onSuccess: () => void;
  onStateChange?: (state: 'upload' | 'review') => void;
}

const SUPPORTED_BANKS = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'IndusInd', 'Yes Bank', 'PNB', 'BOB', 'Generic'];

type FlowState = 'idle' | 'uploading' | 'bank_confirm' | 'processing' | 'ready' | 'failed';

export const BankStatementImportForm: React.FC<BankStatementImportFormProps> = ({
  onSuccess,
  onStateChange,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [importId, setImportId] = useState<string | null>(null);
  const [detectedBank, setDetectedBank] = useState<string>('Generic');
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [overriding, setOverriding] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [stepMessage, setStepMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toasts = useToasts();

  // ── drag / drop ──────────────────────────────────────────────────────────
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
  };

  // ── file validation + upload ─────────────────────────────────────────────
  const handleFileSelection = async (selectedFile: File) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(selectedFile.type)) {
      toasts.error('Invalid File Type', 'Only PDF, PNG, JPG, and JPEG statement files are supported.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toasts.error('File Too Large', 'Maximum statement file size is 5MB.');
      return;
    }
    setFile(selectedFile);
    await uploadStatement(selectedFile);
  };

  const uploadStatement = async (statementFile: File) => {
    setFlowState('uploading');
    setStepMessage('Uploading statement file to secure storage...');
    try {
      const data = await expenseService.uploadStatement(statementFile);
      setImportId(data.id);

      // Show bank confirmation before processing starts
      const bank = data.bank_name || data.detected_bank || 'Generic';
      const confidence = data.detected_bank_confidence ?? data.detection_confidence ?? 0;
      setDetectedBank(bank);
      setDetectionConfidence(Math.round(confidence));
      setSelectedBank(bank);

      // Transition to bank confirmation step
      setFlowState('bank_confirm');
      toasts.success('Upload Successful', 'Please confirm your bank before we process the statement.');
    } catch (err: any) {
      toasts.error('Upload Failed', err.message || 'Could not upload bank statement.');
      setFile(null);
      setFlowState('failed');
    }
  };

  // ── bank override + start processing ─────────────────────────────────────
  const handleConfirmBank = async () => {
    if (!importId) return;

    setOverriding(true);
    try {
      await expenseService.overrideBankParser(importId, selectedBank);
    } catch (err: any) {
      toasts.error('Processing Failed', err.message || 'Could not initiate statement processing.');
      setOverriding(false);
      return;
    }
    setOverriding(false);

    // Kick off background processing
    setFlowState('processing');
    setStepMessage('Extracting PDF text and classifying transactions with AI...');
    if (onStateChange) onStateChange('upload'); // keep modal compact during processing
  };

  // ── status polling ────────────────────────────────────────────────────────
  useEffect(() => {
    if (flowState !== 'processing' || !importId) return;

    const interval = setInterval(async () => {
      try {
        const data = await expenseService.getStatementStatus(importId);

        if (data.status === 'PROCESSING') {
          setStepMessage('Extracting PDF text and detecting bank format...');
        } else if (data.status === 'READY_FOR_REVIEW') {
          clearInterval(interval);
          toasts.success('Extraction Complete', 'Statement transactions ready for your review.');
          await fetchSummary(importId);
          setFlowState('ready');
          if (onStateChange) onStateChange('review');
        } else if (data.status === 'FAILED') {
          clearInterval(interval);
          setFlowState('failed');
          toasts.error('Extraction Failed', 'OCR parser failed to extract transactions. Please try another copy.');
        }
      } catch (err) {
        console.error('Error polling status', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [flowState, importId]);

  const fetchSummary = async (id: string) => {
    try {
      const summaryData = await expenseService.getStatementSummary(id);
      setSummary(summaryData);
    } catch {
      toasts.error('Fetch Failed', 'Could not load statement summary details.');
    }
  };

  const handleReset = () => {
    setFile(null);
    setImportId(null);
    setFlowState('idle');
    setSummary(null);
    setDetectedBank('Generic');
    setDetectionConfidence(0);
    setSelectedBank('');
    setStepMessage('');
    if (onStateChange) onStateChange('upload');
  };

  // ── render: processing spinner ────────────────────────────────────────────
  if (flowState === 'uploading' || flowState === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5 text-center bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-2xl backdrop-blur-xl">
        <RefreshCw className="w-10 h-10 text-[var(--primary-color)] animate-spin" />
        <div className="space-y-2">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {flowState === 'uploading' ? 'Uploading Statement...' : 'Processing Bank Statement...'}
          </p>
          <p className="text-xs text-[var(--text-secondary)]/60 max-w-xs">{stepMessage}</p>
        </div>
        <div className="w-48 bg-[var(--surface-raised)] h-1.5 rounded-full overflow-hidden">
          <div className="bg-[var(--primary-color)] h-full animate-[loading_1.5s_infinite_linear]" style={{ width: '40%' }} />
        </div>
      </div>
    );
  }

  // ── render: bank confirmation ─────────────────────────────────────────────
  if (flowState === 'bank_confirm') {
    return (
      <div className="flex flex-col gap-5">
        {/* Detected bank banner */}
        <div className="flex items-center gap-3 p-4 bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl">
          <div className="p-2.5 bg-[var(--primary-color)]/10 rounded-xl">
            <Building2 className="w-5 h-5 text-[var(--primary-color)]" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 mb-0.5">
              Auto-Detected Bank
            </p>
            <p className="text-sm font-bold text-[var(--text-primary)]">{detectedBank} Bank</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 mb-0.5">
              Confidence
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-[var(--surface-raised)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    detectionConfidence >= 80 ? 'bg-green-400' :
                    detectionConfidence >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${detectionConfidence}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${
                detectionConfidence >= 80 ? 'text-green-400' :
                detectionConfidence >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {detectionConfidence}%
              </span>
            </div>
          </div>
        </div>

        {/* Manual override grid */}
        <div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/50 mb-2">
            Not correct? Select your bank:
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {SUPPORTED_BANKS.map((bank) => (
              <button
                key={bank}
                onClick={() => setSelectedBank(bank)}
                className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition-all duration-200 cursor-pointer truncate ${
                  selectedBank === bank
                    ? 'bg-[var(--primary-color)]/20 border-[var(--primary-color)]/40 text-white shadow-[0_0_12px_rgba(var(--primary-color-rgb),0.2)]'
                    : 'bg-[var(--surface-subtle)] border-[var(--border-color)] text-[var(--text-secondary)]/60 hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
                }`}
              >
                {bank}
              </button>
            ))}
          </div>
        </div>

        {/* File info */}
        {file && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border-color)] text-[10px] text-[var(--text-secondary)]/50">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{file.name}</span>
            <span className="ml-auto shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 bg-[var(--surface-subtle)] hover:bg-[var(--surface-raised)] text-xs text-[var(--text-primary)] rounded-xl transition-all cursor-pointer font-bold border border-[var(--border-color)]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmBank}
            disabled={overriding || !selectedBank}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-slate-950 rounded-xl cursor-pointer transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          >
            {overriding ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Applying Parser...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Continue with {selectedBank} Bank
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── render: failure ───────────────────────────────────────────────────────
  if (flowState === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-5 text-center bg-[var(--surface-subtle)] border border-red-500/10 rounded-2xl backdrop-blur-xl">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-[var(--text-primary)]">Extraction Failed</p>
          <p className="text-xs text-[var(--text-secondary)]/60 max-w-xs">
            We couldn't extract any structured transactions from your statement. Make sure the file isn't password
            protected and contains readable transaction text.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] text-xs text-[var(--text-primary)] rounded-xl transition-all cursor-pointer font-bold border border-[var(--border-color)]"
        >
          Try Another File
        </button>
      </div>
    );
  }

  // ── render: review ────────────────────────────────────────────────────────
  if (flowState === 'ready' && summary) {
    return (
      <BankStatementReview
        importId={importId!}
        summary={summary}
        onSuccess={() => {
          toasts.success('Success', 'Transactions imported and saved.');
          onSuccess();
        }}
        onCancel={handleReset}
      />
    );
  }

  // ── render: idle drop zone ────────────────────────────────────────────────
  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`group relative flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer backdrop-blur-xl ${
        dragActive
          ? 'border-[var(--primary-color)] bg-[var(--surface-raised)] shadow-[0_0_15px_rgba(255,255,255,0.05)]'
          : 'border-[var(--border-color)] hover:border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-raised)]'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4 text-center pointer-events-none">
        <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border-color)] group-hover:scale-110 transition-transform duration-300 shadow-glass">
          <UploadCloud className="w-8 h-8 text-[var(--primary-color)]" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-[var(--text-primary)]">Import Bank Statement</p>
          <p className="text-xs text-[var(--text-secondary)]/50">
            Drag and drop statement file here, or click to browse
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]/30 mt-2">
          <FileText className="w-3.5 h-3.5" />
          <span>Supports PDF, PNG, JPG, JPEG (Max 5MB)</span>
        </div>
      </div>
    </div>
  );
};
