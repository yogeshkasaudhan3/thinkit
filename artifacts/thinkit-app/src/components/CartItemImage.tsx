import { useState } from 'react';
import { cloudinaryOpt } from '../lib/imgUtils';

/**
 * Shared product-image thumbnail for cart / checkout item rows.
 *
 * Uses the exact same `cloudinaryOpt` transform pipeline as the product
 * listing `ProductCard`, so cart/checkout images are served through the same
 * CDN/proxy optimisation. Falls back to a brand/name initial badge (matching
 * the listing page's fallback) if the product has no image or it fails to
 * load.
 */
export default function CartItemImage({
  imageUrl,
  name,
  brand,
  size = 64,
}: {
  imageUrl: string | null | undefined;
  name: string;
  brand?: string | null;
  /** Rendered box size in px (square). Default 64 matches the cart row. */
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);

  // Request an image ~2x the rendered box for crisp rendering on retina screens.
  const src = cloudinaryOpt(imageUrl, Math.max(size * 2, 96));

  return (
    <div
      className="rounded-lg border border-gray-100 bg-white flex items-center justify-center relative flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: size * 0.1 }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-1 text-center text-[9px] font-semibold text-gray-400 leading-tight">
          {brand || name}
        </div>
      )}
    </div>
  );
}
