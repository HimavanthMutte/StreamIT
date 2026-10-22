import React from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';

const VideoUploadArea = ({
  isHost,
  isUploading,
  uploadProgress,
  uploadError,
  onFileUpload,
  onRetry,
}) => {
  if (isHost) {
    return (
      <div className="flex flex-col items-center justify-center text-[var(--color-text-main)] w-full max-w-md p-6 border-2 border-dashed border-[var(--color-surface-border)] bg-[var(--color-surface)]">
        <UploadCloud size={48} className="mb-4 text-[var(--color-accent)]" />
        <h3 className="text-lg font-bold mb-2 uppercase tracking-wide">Upload Video</h3>
        <p className="text-xs text-[var(--color-text-muted)] text-center mb-6">
          Select a video file to play for the room.
        </p>

        {isUploading ? (
          <div className="w-full flex flex-col items-center">
            <Loader2 size={24} className="animate-spin text-[var(--color-accent)] mb-2" />
            <div className="w-full bg-[var(--color-bg-base)] h-2 border border-[var(--color-surface-border)] mt-2">
              <div
                className="bg-[var(--color-accent)] h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs font-bold mt-2 tracking-wider">
              {uploadProgress === 100 ? 'PROCESSING VIDEO...' : `${uploadProgress}% UPLOADED`}
            </span>
          </div>
        ) : (
          <div className="upload-controls">
            <label className="gradient-btn px-6 py-2 cursor-pointer uppercase text-xs font-bold tracking-wider inline-block">
              Select File
              <input type="file" accept="video/*" className="hidden" onChange={onFileUpload} />
            </label>
            {uploadError && (
              <div className="w-full flex flex-col items-center mt-2">
                <p className="text-sm text-[var(--color-warning)] mb-2">{uploadError}</p>
                <button onClick={onRetry} className="gradient-btn px-4 py-2 cursor-pointer">
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-[var(--color-text-muted)] p-8 text-center">
      <Loader2 size={40} className="animate-spin mb-4 opacity-50" />
      <h3 className="text-lg font-bold uppercase tracking-widest text-[var(--color-text-main)] mb-2">
        Waiting for Host
      </h3>
      <p className="text-sm font-medium">The host is uploading a video. Please wait...</p>
    </div>
  );
};

export default VideoUploadArea;
