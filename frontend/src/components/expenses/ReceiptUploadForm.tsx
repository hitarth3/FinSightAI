import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../../services/expenseService';
import { useToasts } from '../../context/ToastContext';
import { GlassButton } from '../ui/GlassButton';
import { ReceiptPreview } from './ReceiptPreview';
import { UploadCloud, Award, RefreshCw } from 'lucide-react';

interface ReceiptUploadFormProps {
  onSuccess: () => void;
}

export const ReceiptUploadForm: React.FC<ReceiptUploadFormProps> = ({ onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const [parsedData, setParsedData] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('FOOD');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [expenseDate, setExpenseDate] = useState('');
  const [notes, setNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const toasts = useToasts();

  const uploadMutation = useMutation({
    mutationFn: expenseService.uploadReceipt,
    onSuccess: (data) => {
      setParsedData(data);
      setAmount(data.amount.toString());
      setMerchant(data.merchant);
      setCategory(data.category);
      setExpenseDate(data.date);
      toasts.success('Scan Completed', 'Grok AI has parsed the receipt details.');
    },
    onError: (err: any) => {
      toasts.error('Scan Failed', err.message || 'Could not parse receipt.');
      setFile(null);
    }
  });

  const confirmMutation = useMutation({
    mutationFn: expenseService.confirmReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenseSummary'] });
      queryClient.invalidateQueries({ queryKey: ['topMerchants'] });
      queryClient.invalidateQueries({ queryKey: ['categoryBreakdown'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyTrend'] });
      queryClient.invalidateQueries({ queryKey: ['expenseInsights'] });
      toasts.success('Expense Saved', 'Your transaction was confirmed and saved.');
      onSuccess();
    },
    onError: (err: any) => {
      toasts.error('Failed to Save', err.message || 'An error occurred.');
    }
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelection(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(selectedFile.type)) {
      toasts.error('Invalid File Type', 'Only PDF, PNG, JPG, and JPEG files are supported.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toasts.error('File Too Large', 'Maximum file size is 5MB.');
      return;
    }
    setFile(selectedFile);
    uploadMutation.mutate(selectedFile);
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !merchant || !expenseDate) {
      toasts.error('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    confirmMutation.mutate({
      upload_id: parsedData.upload_id,
      amount: parseFloat(amount),
      merchant,
      category,
      payment_method: paymentMethod,
      expense_date: expenseDate,
      notes: notes || null
    });
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setAmount('');
    setMerchant('');
    setNotes('');
  };

  const categories = [
    'FOOD', 'TRAVEL', 'SHOPPING', 'RENT', 'ENTERTAINMENT', 'UTILITIES', 
    'HEALTHCARE', 'EDUCATION', 'GROCERIES', 'SUBSCRIPTION', 'MISCELLANEOUS'
  ];

  const paymentMethods = [
    'UPI', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING'
  ];

  if (uploadMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <RefreshCw className="w-10 h-10 text-[var(--primary-color)] animate-spin" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-[var(--text-primary)]">Parsing Receipt details...</p>
          <p className="text-[10px] text-[var(--text-secondary)]/60">OCR Extraction & Grok AI scanning in progress...</p>
        </div>
      </div>
    );
  }

  if (parsedData) {
    const confidencePercent = Math.round(parsedData.confidence * 100);
    const needsReview = parsedData.needs_manual_review || parsedData.confidence < 0.75;

    return (
      <form onSubmit={handleConfirmSubmit} className="space-y-4 text-xs">
        {/* Confidence / Review Badge */}
        {needsReview ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase flex items-center gap-1">⚠️ Needs Manual Review</span>
                <span className="text-[9px] text-[var(--text-secondary)]/70">Low extraction confidence. Correct fields manually.</span>
              </div>
            </div>
            <span className="text-xs font-black">{confidencePercent}% Confidence</span>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-xl bg-success/5 border border-success/15">
            <div className="flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-success shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-success uppercase">Receipt Extracted via Grok AI</span>
                <span className="text-[9px] text-[var(--text-secondary)]/50">Verify fields before saving.</span>
              </div>
            </div>
            <span className="text-xs font-black text-success">{confidencePercent}% Confidence</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Merchant Name</label>
                <input
                  type="text"
                  required
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Expense Date</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 cursor-pointer appearance-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]/50 cursor-pointer appearance-none"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm} value={pm} className="bg-[var(--bg-color)] text-[var(--text-primary)]">{pm.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <ReceiptPreview 
              receiptUrl={parsedData.receipt_url} 
              thumbnailUrl={parsedData.thumbnail_url} 
              fileName={file?.name}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]/60">Notes</label>
          <textarea
            placeholder="Add description..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none resize-none"
          />
        </div>

        <div className="pt-2 flex justify-between gap-3">
          <GlassButton
            type="button"
            variant="outline"
            onClick={handleReset}
            className="border-[var(--border-color)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
          >
            Scan Another Receipt
          </GlassButton>
          
          <GlassButton
            type="submit"
            disabled={confirmMutation.isPending}
            className="px-6 font-bold"
          >
            {confirmMutation.isPending ? 'Confirming...' : 'Confirm & Save'}
          </GlassButton>
        </div>
      </form>
    );
  }

  return (
    <div 
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3.5 cursor-pointer transition-all duration-300 ${
        dragActive 
          ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5' 
          : 'border-[var(--border-color)] hover:border-[var(--primary-color)]/30 hover:bg-white/[0.01]'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileChange}
      />
      <div className="p-4 rounded-full bg-[var(--surface-subtle)] text-[var(--primary-color)]">
        <UploadCloud className="w-8 h-8" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs font-bold text-[var(--text-primary)]">Drag and drop receipt file here</p>
        <p className="text-[10px] text-[var(--text-secondary)]/55">Supports PDF, PNG, JPG, JPEG (Max 5MB)</p>
      </div>
    </div>
  );
};
export default ReceiptUploadForm;
