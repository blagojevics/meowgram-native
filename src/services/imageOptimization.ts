/**
 * Image Optimization Service
 * Handles image caching, progressive loading, and Cloudinary transformations
 * for fast loading with maintained quality
 */

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

interface CacheEntry {
  url: string;
  timestamp: number;
  size: number;
}

interface ImageCache {
  [key: string]: CacheEntry;
}

let imageCache: ImageCache = {};
let cacheSize = 0;

/**
 * Generate Cloudinary transformation URL for optimized delivery
 * Returns thumbnail, medium, and full quality versions
 */
export const getOptimizedImageUrl = (
  cloudinaryUrl: string,
  quality: "thumbnail" | "medium" | "full" = "medium"
): string => {
  if (!cloudinaryUrl || !cloudinaryUrl.includes("cloudinary")) {
    return cloudinaryUrl;
  }

  // Extract base URL and public ID from Cloudinary URL
  const transforms: Record<string, string> = {
    // Thumbnail: 200px, heavily compressed for fast load
    thumbnail: "/c_scale,w_200,q_60,f_auto/",
    // Medium: 600px, good quality for feed
    medium: "/c_scale,w_600,q_80,f_auto/",
    // Full: 1080px, high quality for detail view
    full: "/c_scale,w_1080,q_85,f_auto/",
  };

  const transform = transforms[quality] || transforms.medium;

  // Insert transformation into Cloudinary URL
  const urlParts = cloudinaryUrl.split("/upload/");
  if (urlParts.length === 2) {
    return `${urlParts[0]}/upload${transform}${urlParts[1]}`;
  }

  return cloudinaryUrl;
};

/**
 * Get progressive image URLs (thumbnail, medium, full)
 * Used for progressive image loading
 */
export const getProgressiveImageUrls = (cloudinaryUrl: string) => {
  return {
    thumbnail: getOptimizedImageUrl(cloudinaryUrl, "thumbnail"),
    medium: getOptimizedImageUrl(cloudinaryUrl, "medium"),
    full: getOptimizedImageUrl(cloudinaryUrl, "full"),
  };
};

/**
 * Cache management
 */
export const cacheImageUrl = (url: string, size: number = 0) => {
  const cacheKey = url;
  const now = Date.now();

  // Remove expired entries
  Object.keys(imageCache).forEach((key) => {
    if (now - imageCache[key].timestamp > CACHE_EXPIRY_MS) {
      cacheSize -= imageCache[key].size;
      delete imageCache[key];
    }
  });

  // If cache is full, remove oldest entries
  if (cacheSize + size > MAX_CACHE_SIZE) {
    const sortedEntries = Object.entries(imageCache).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    for (const [key, entry] of sortedEntries) {
      if (cacheSize + size <= MAX_CACHE_SIZE) break;
      cacheSize -= entry.size;
      delete imageCache[key];
    }
  }

  imageCache[cacheKey] = {
    url,
    timestamp: now,
    size,
  };
  cacheSize += size;
};

/**
 * Clear cache
 */
export const clearImageCache = () => {
  imageCache = {};
  cacheSize = 0;
};

/**
 * Get cache stats
 */
export const getCacheStats = () => ({
  entries: Object.keys(imageCache).length,
  totalSize: (cacheSize / 1024 / 1024).toFixed(2),
  maxSize: (MAX_CACHE_SIZE / 1024 / 1024).toFixed(0),
});

/**
 * Batch optimize images with transformations
 */
export const optimizeImageBatch = (urls: string[]) => {
  return urls.map((url) => getOptimizedImageUrl(url, "medium"));
};

/**
 * Get responsive image size based on screen width
 */
export const getResponsiveImageSize = (screenWidth: number) => {
  if (screenWidth < 400) return 300;
  if (screenWidth < 600) return 600;
  if (screenWidth < 900) return 900;
  return 1080;
};

/**
 * Pre-warm image cache by prefetching images
 */
export const prefetchImages = async (urls: string[]) => {
  const fetchPromises = urls.map(async (url) => {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) {
        const size = parseInt(response.headers.get("content-length") || "0");
        cacheImageUrl(url, size);
      }
    } catch (error) {
      console.warn(`Failed to prefetch image: ${url}`, error);
    }
  });

  await Promise.allSettled(fetchPromises);
};

export default {
  getOptimizedImageUrl,
  getProgressiveImageUrls,
  cacheImageUrl,
  clearImageCache,
  getCacheStats,
  optimizeImageBatch,
  getResponsiveImageSize,
  prefetchImages,
};
