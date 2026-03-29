import { useState, useCallback } from 'react';
import type { ParsedGame } from '@/types';
import { parseScreenshot, saveGame } from '../shared/api.js';
import { ParsedPreview } from './parsed-preview.js';
import styles from './upload-page.module.css';

type Phase = 'idle' | 'parsing' | 'preview' | 'saving' | 'saved' | 'error';

export function UploadPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [tempFile, setTempFile] = useState('');
  const [parsed, setParsed] = useState<ParsedGame | null>(null);
  const [savedId, setSavedId] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setPhase('parsing');
    setErrorMsg('');
    try {
      const result = await parseScreenshot(file);
      setTempFile(result.tempFile);
      setParsed(result.parsed);
      setPhase('preview');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setPhase('error');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleConfirm = useCallback(async (confirmed: ParsedGame) => {
    setPhase('saving');
    try {
      const { id } = await saveGame(tempFile, confirmed);
      setSavedId(id);
      setPhase('saved');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setPhase('error');
    }
  }, [tempFile]);

  const handleReset = useCallback(() => {
    setPhase('idle');
    setParsed(null);
    setTempFile('');
    setSavedId('');
    setErrorMsg('');
  }, []);

  if (phase === 'preview' && parsed) {
    return (
      <ParsedPreview
        parsed={parsed}
        onChange={setParsed}
        onConfirm={handleConfirm}
        onCancel={handleReset}
        saving={false}
      />
    );
  }

  if (phase === 'saving') {
    return <div className={styles.status}>Saving game…</div>;
  }

  if (phase === 'saved') {
    return (
      <div className={styles.status}>
        <p className={styles.success}>Game saved!</p>
        <p className={styles.gameId}>ID: <code>{savedId}</code></p>
        <button className={styles.btn} onClick={handleReset}>Upload another</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Upload Postgame Screenshot</h1>
      <p className={styles.sub}>Drop a League of Legends scoreboard screenshot and we'll extract all the data automatically.</p>

      <label
        className={`${styles.dropzone} ${dragOver ? styles.dragOver : ''} ${phase === 'parsing' ? styles.parsing : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        aria-label="Upload postgame screenshot"
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className={styles.fileInput}
          onChange={handleInputChange}
          disabled={phase === 'parsing'}
        />
        {phase === 'parsing' ? (
          <span className={styles.parsingText}>Analyzing image with Gemini…</span>
        ) : (
          <>
            <span className={styles.dropIcon} aria-hidden="true">📸</span>
            <span className={styles.dropText}>Click or drag & drop your screenshot here</span>
            <span className={styles.dropHint}>PNG, JPEG, or WEBP · max 20 MB</span>
          </>
        )}
      </label>

      {phase === 'error' && (
        <p role="alert" className={styles.error}>{errorMsg}</p>
      )}
    </div>
  );
}
