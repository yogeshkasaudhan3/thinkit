import { useCallback, useState } from 'react';

export interface ImageUploadResult {
  imageUrl: string;
  originalSize: number;
  optimizedSize: number;
}

interface UseImageUploadOptions {
  onSuccess?: (result: ImageUploadResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Uploads a product image through the server-side Sharp pipeline.
 *
 * Unlike the direct-to-GCS presigned URL flow, this sends the raw file to
 * POST /api/admin/images/upload where the server:
 *   1. Resizes to ≤ 600 × 600 px
 *   2. Converts to WebP at quality 85
 *   3. Strips EXIF/GPS metadata
 *   4. Uploads the optimised buffer to GCS
 *   5. Returns the permanent storage URL + size stats
 *
 * The admin never needs to resize or compress anything manually.
 */
export function useImageUpload(options: UseImageUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<ImageUploadResult | null>(null);

  const uploadImage = useCallback(
    async (file: File): Promise<ImageUploadResult | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(10);
      setLastResult(null);

      try {
        const formData = new FormData();
        formData.append('image', file);

        setProgress(30);

        const response = await fetch('/api/admin/images/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
          // Don't set Content-Type — browser sets it automatically with the
          // correct multipart boundary when using FormData.
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error || 'Upload failed');
        }

        const result: ImageUploadResult = await response.json();
        setProgress(100);
        setLastResult(result);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error('Upload failed');
        setError(uploadError);
        options.onError?.(uploadError);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { uploadImage, isUploading, error, progress, lastResult };
}
