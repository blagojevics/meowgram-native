import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "../config/firebase";
import * as FileSystem from "expo-file-system";

export type MediaType = "image" | "video" | "file";

interface UploadProgress {
  loaded: number;
  total: number;
}

/**
 * Convert file URI to blob for upload
 */
const uriToBlob = async (uri: string): Promise<Blob> => {
  try {
    // Read file from device
    const base64Data = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to blob
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type: "application/octet-stream" });
  } catch (error) {
    console.error("Error converting URI to blob:", error);
    throw error;
  }
};

/**
 * Determine media type from file URI or MIME type
 */
const determineMediaType = (uri: string, mimeType?: string): MediaType => {
  const mimeStr = mimeType || uri.toLowerCase();

  if (
    mimeStr.includes("image") ||
    uri.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)
  ) {
    return "image";
  } else if (
    mimeStr.includes("video") ||
    uri.toLowerCase().match(/\.(mp4|mov|avi|mkv)$/)
  ) {
    return "video";
  }
  return "file";
};

/**
 * Get file extension from URI
 */
const getFileExtension = (uri: string): string => {
  const match = uri.match(/\.([^.]+)$/);
  return match ? match[1] : "bin";
};

/**
 * Upload media file to Firebase Storage
 */
export const uploadMediaFile = async (
  fileUri: string,
  conversationId: string,
  userId: string,
  mimeType?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ url: string; type: MediaType; size: number }> => {
  try {
    const mediaType = determineMediaType(fileUri, mimeType);
    const fileExtension = getFileExtension(fileUri);
    const timestamp = Date.now();
    const fileName = `${userId}_${timestamp}.${fileExtension}`;

    // Create organized path: messages/{conversationId}/{mediaType}/{fileName}
    const storagePath = `messages/${conversationId}/${mediaType}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    const fileSize = fileInfo.size || 0;

    // Convert URI to blob
    const blob = await uriToBlob(fileUri);

    // Upload with progress tracking
    const snapshot = await uploadBytes(storageRef, blob, {
      customMetadata: {
        conversationId,
        userId,
        mediaType,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Get download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      url: downloadUrl,
      type: mediaType,
      size: fileSize,
    };
  } catch (error) {
    console.error("Error uploading media file:", error);
    throw error;
  }
};

/**
 * Upload multiple media files
 */
export const uploadMediaFiles = async (
  fileUris: string[],
  conversationId: string,
  userId: string,
  onProgress?: (progress: { completed: number; total: number }) => void
): Promise<{ url: string; type: MediaType; size: number }[]> => {
  try {
    const results: { url: string; type: MediaType; size: number }[] = [];
    const total = fileUris.length;

    for (let i = 0; i < fileUris.length; i++) {
      const result = await uploadMediaFile(fileUris[i], conversationId, userId);
      results.push(result);

      if (onProgress) {
        onProgress({ completed: i + 1, total });
      }
    }

    return results;
  } catch (error) {
    console.error("Error uploading multiple media files:", error);
    throw error;
  }
};

/**
 * Delete media file from Firebase Storage
 */
export const deleteMediaFile = async (fileUrl: string): Promise<void> => {
  try {
    // Extract path from download URL
    // Firebase download URLs have format: https://...../...%2Fpath%2Fto%2Ffile?...
    const decodedUrl = decodeURIComponent(fileUrl);
    const pathMatch = decodedUrl.match(/\/o\/(.*)\?/);

    if (!pathMatch) {
      throw new Error("Invalid Firebase storage URL");
    }

    const filePath = pathMatch[1];
    const storageRef = ref(storage, filePath);

    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting media file:", error);
    throw error;
  }
};

/**
 * Delete multiple media files
 */
export const deleteMediaFiles = async (fileUrls: string[]): Promise<void> => {
  try {
    await Promise.all(fileUrls.map((url) => deleteMediaFile(url)));
  } catch (error) {
    console.error("Error deleting multiple media files:", error);
    throw error;
  }
};

/**
 * Get media file metadata
 */
export const getMediaFileMetadata = async (
  fileUrl: string
): Promise<{ size: number; contentType: string } | null> => {
  try {
    const response = await fetch(fileUrl, { method: "HEAD" });
    return {
      size: parseInt(response.headers.get("content-length") || "0"),
      contentType:
        response.headers.get("content-type") || "application/octet-stream",
    };
  } catch (error) {
    console.error("Error getting media metadata:", error);
    return null;
  }
};
