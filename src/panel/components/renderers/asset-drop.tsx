import { useState, useCallback } from 'react';
import { Upload, Image, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssetDropProps {
  onUpload: (file: File) => Promise<string>;
  onInsert: (url: string) => void;
}

export function AssetDrop({ onUpload, onInsert }: AssetDropProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;

      setPreview(URL.createObjectURL(file));
      setUploading(true);

      try {
        const url = await onUpload(file);
        onInsert(url);
      } catch {
        // Upload failed
      } finally {
        setUploading(false);
      }
    },
    [onUpload, onInsert],
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'rounded-lg border-2 border-dashed p-4 text-center transition-colors duration-150',
        dragging ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          {preview && (
            <img src={preview} alt="Upload preview" className="h-16 w-16 rounded object-cover" />
          )}
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Uploading...</p>
        </div>
      ) : preview ? (
        <div className="flex flex-col items-center gap-2">
          <img src={preview} alt="Uploaded" className="h-20 w-20 rounded object-cover" />
          <p className="text-xs text-positive">Uploaded successfully</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {dragging ? (
            <Image className="h-6 w-6 text-primary" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
          <p className="text-xs text-muted-foreground">
            Drop an image here to add it to the page
          </p>
        </div>
      )}
    </div>
  );
}
