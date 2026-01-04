import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const getGoogleDriveDirectLink = (url) => {
  if (!url) return '';
  // Handle open?id= logic
  if (url.includes('drive.google.com') && url.includes('id=')) {
    const idMatch = url.match(/id=([^&]+)/);
    // Use lh3.googleusercontent.com/d/ID as it is much more reliable for image tags
    if (idMatch) return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
  }
  // Handle /file/d/ID/view logic
  if (url.includes('drive.google.com/file/d/')) {
    const idMatch = url.match(/\/d\/([^/]+)/);
    if (idMatch) return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
  }
  return url;
};

export const getGoogleDrivePreviewLink = (url) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    let id = null;
    if (url.includes('id=')) id = url.match(/id=([^&]+)/)?.[1];
    else if (url.includes('/file/d/')) id = url.match(/\/d\/([^/]+)/)?.[1];

    if (id) return `https://drive.google.com/file/d/${id}/preview`;
  }
  return url;
};

export const getLinkType = (url) => {
  if (!url) return 'link';
  const u = url.toLowerCase();
  if (u.match(/\.(jpeg|jpg|gif|png|webp)$/)) return 'image';
  if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com') || u.match(/\.(mp4|webm|ogg)$/)) return 'video';
  if (u.includes('docs.google.com/presentation')) return 'presentation';
  if (u.includes('docs.google.com/document') || u.match(/\.(doc|docx)$/)) return 'document';
  if (u.includes('docs.google.com/spreadsheets') || u.match(/\.(xls|xlsx|csv)$/)) return 'spreadsheet';
  if (u.endsWith('.pdf')) return 'pdf';
  if (u.includes('drive.google.com')) return 'storage';
  if (u.includes('github.com') || u.includes('gitlab.com')) return 'code';
  return 'link';
};

export const getEmbedUrl = (url, type) => {
  if (!url) return null;

  // Force specific handling if type is provided
  if (type === 'presentation' || type === 'pdf' || type === 'document' || type === 'video') {
    // If it's a Google Drive link and we expect embedding
    if (url.includes('drive.google.com')) {
      let id = null;
      if (url.includes('id=')) id = url.match(/id=([^&]+)/)?.[1];
      else if (url.includes('/file/d/')) id = url.match(/\/d\/([^/]+)/)?.[1];
      else if (url.includes('/d/')) id = url.match(/\/d\/([^/]+)/)?.[1];

      if (id) return `https://drive.google.com/file/d/${id}/preview`;
    }

    // Generic PDF or Doc (Online File) - Use Google Docs Viewer
    if ((type === 'pdf' || type === 'document') && !url.includes('google.com')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }
  }

  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.includes('youtu.be')
      ? url.split('/').pop()
      : new URLSearchParams(new URL(url).search).get('v');
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  // Vimeo
  if (url.includes('vimeo.com')) {
    const videoId = url.split('/').pop();
    // Verify it's numeric to avoid non-video pages
    if (videoId && /^\d+$/.test(videoId)) {
      return `https://player.vimeo.com/video/${videoId}`;
    }
  }

  // Google Slides
  if (url.includes('docs.google.com/presentation')) {
    return url.replace(/\/edit.*$/, '/embed?start=false&loop=false&delayms=3000');
  }

  // Google Drive (General Fallback)
  if (url.includes('drive.google.com')) {
    // Handle open?id= logic
    if (url.includes('id=')) {
      const idMatch = url.match(/id=([^&]+)/);
      if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
    }
    // Handle /file/d/ID/view logic
    if (url.includes('/file/d/')) {
      const idMatch = url.match(/\/d\/([^/]+)/);
      if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
    }
  }

  // Generic Video Files
  if (type === 'video' && url.match(/\.(mp4|webm|ogg)$/i)) {
    return url;
  }

  return null;
};

export const isEmbeddable = (url, type) => {
  return !!getEmbedUrl(url, type);
};
