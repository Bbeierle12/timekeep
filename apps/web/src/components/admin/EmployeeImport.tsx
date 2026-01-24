import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useAuth } from '../../hooks/useAuth';
import {
  importEmployees,
  getImportHistory,
  ImportSummary,
  ImportHistory
} from '../../services/employees';

type EmployeeImportProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function EmployeeImport({ isOpen, onClose }: EmployeeImportProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const [view, setView] = useState<'upload' | 'result' | 'history'>('upload');

  const { data: importHistory } = useQuery({
    queryKey: ['importHistory'],
    queryFn: () => getImportHistory(10),
    enabled: isAuthenticated && view === 'history'
  });

  const importMutation = useMutation({
    mutationFn: () => importEmployees(selectedFile!.name, csvContent),
    onSuccess: (result) => {
      setImportResult(result);
      setView('result');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['importHistory'] });
    }
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setSelectedFile(file);
    const content = await file.text();
    setCsvContent(content);
  };

  const handleImport = () => {
    if (!selectedFile || !csvContent) return;
    importMutation.mutate();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCsvContent('');
    setImportResult(null);
    setView('upload');
    onClose();
  };

  const renderUploadView = () => (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-700 pb-4">
        <button
          onClick={() => setView('upload')}
          className={`px-3 py-1.5 text-sm font-medium rounded ${
            view === 'upload' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Upload
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-3 py-1.5 text-sm font-medium rounded ${
            view === 'history' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          History
        </button>
      </div>

      <div className="text-sm text-slate-400 space-y-2">
        <p>Upload a CSV file with employee data. Required columns:</p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li><code className="text-sky-400">initials</code> - 2-6 character unique identifier</li>
          <li><code className="text-sky-400">full_name</code> (or <code className="text-sky-400">name</code>) - Employee's full name</li>
        </ul>
        <p>Optional columns:</p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li><code className="text-slate-300">pin</code> - 4+ digit PIN (digits only)</li>
          <li><code className="text-slate-300">employee_code</code> - External employee ID</li>
          <li><code className="text-slate-300">hourly_rate</code> - Hourly pay rate</li>
          <li><code className="text-slate-300">state_code</code> - 2-letter state code (default: CA)</li>
          <li><code className="text-slate-300">is_exempt</code> - true/false for exempt status</li>
        </ul>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          selectedFile ? 'border-sky-500 bg-sky-500/10' : 'border-slate-600 hover:border-slate-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {selectedFile ? (
          <div className="space-y-3">
            <div className="w-12 h-12 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-white font-medium">{selectedFile.name}</p>
            <p className="text-sm text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setCsvContent('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-slate-300">Drop a CSV file here or click to browse</p>
            <Button onClick={() => fileInputRef.current?.click()}>
              Select File
            </Button>
          </div>
        )}
      </div>

      {importMutation.isError && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
          {(importMutation.error as Error).message || 'Failed to import employees'}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={!selectedFile || importMutation.isPending}
        >
          {importMutation.isPending ? 'Importing...' : 'Import Employees'}
        </Button>
      </div>
    </div>
  );

  const renderResultView = () => {
    if (!importResult) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{importResult.totalRows}</p>
            <p className="text-sm text-slate-400">Total Rows</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{importResult.successfulRows}</p>
            <p className="text-sm text-slate-400">Imported</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{importResult.failedRows}</p>
            <p className="text-sm text-slate-400">Failed</p>
          </Card>
        </div>

        {importResult.failedRows > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300">Errors:</h4>
            <div className="max-h-48 overflow-y-auto bg-slate-800/50 rounded-lg p-3 space-y-2">
              {importResult.results
                .filter((r) => !r.success)
                .map((r, i) => (
                  <div key={i} className="text-sm text-red-400">
                    {r.error}
                  </div>
                ))}
            </div>
          </div>
        )}

        {importResult.successfulRows > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 text-sm">
              Successfully imported {importResult.successfulRows} employee(s).
              {importResult.successfulRows > 0 && (
                <> Employees without PINs will need their PIN set before they can log in.</>
              )}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleClose}>Done</Button>
        </div>
      </div>
    );
  };

  const renderHistoryView = () => (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-700 pb-4">
        <button
          onClick={() => setView('upload')}
          className={`px-3 py-1.5 text-sm font-medium rounded ${
            view === 'upload' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Upload
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-3 py-1.5 text-sm font-medium rounded ${
            view === 'history' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          History
        </button>
      </div>

      {!importHistory?.length ? (
        <p className="text-slate-400 text-center py-8">No import history found.</p>
      ) : (
        <div className="space-y-2">
          {importHistory.map((item: ImportHistory) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.filename}</p>
                <p className="text-xs text-slate-400">
                  {new Date(item.started_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-400">{item.successful_rows} imported</span>
                  {item.failed_rows > 0 && (
                    <span className="text-sm text-red-400">{item.failed_rows} failed</span>
                  )}
                </div>
                <span
                  className={`text-xs ${
                    item.status === 'COMPLETED' ? 'text-slate-400' : 'text-yellow-400'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Employees"
    >
      {view === 'upload' && renderUploadView()}
      {view === 'result' && renderResultView()}
      {view === 'history' && renderHistoryView()}
    </Modal>
  );
}
