import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const getEmbedUrl = (input) => {
  if (!input) return '';

  let url = input;

  // Handle iframe HTML snippets - extract src
  if (input.trim().startsWith('<')) {
    const srcMatch = input.match(/src="([^"]+)"/);
    if (srcMatch && srcMatch[1]) {
      url = srcMatch[1];
    }
  }

  try {
    const urlObj = new URL(url);

    // Google Slides
    if (urlObj.hostname.includes('docs.google.com') && urlObj.pathname.includes('/presentation/')) {
      return url.replace(/\/edit.*$/, '/embed?start=false&loop=false&delayms=3000');
    }

    // Canva
    if (urlObj.hostname.includes('canva.com') && (urlObj.pathname.includes('/view') || urlObj.pathname.includes('/edit'))) {
      return url.replace(/\/view.*$|\/edit.*$/, '/view?embed');
    }

    // Figma
    if (urlObj.hostname.includes('figma.com') && (urlObj.pathname.includes('/proto/') || urlObj.pathname.includes('/design/'))) {
      return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
    }

    // Microsoft PowerPoint / OneDrive
    if (urlObj.hostname.includes('onedrive.live.com') || urlObj.hostname.includes('powerpoint.office.com') || urlObj.hostname.includes('sharepoint.com')) {
      if (urlObj.searchParams.get('action') !== 'embedview') {
        if (url.includes('?')) return `${url}&action=embedview`;
        return `${url}?action=embedview`;
      }
    }

    // Prezi
    if (urlObj.hostname.includes('prezi.com') && urlObj.pathname.includes('/p/')) {
      if (!url.includes('/embed')) return `${url.split('?')[0]}/embed`;
    }

    // Pitch
    if (urlObj.hostname.includes('pitch.com')) {
      if (!url.includes('/embed')) return url.replace('pitch.com/', 'pitch.com/embed/');
    }

    // YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId = '';
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.searchParams.get('v')) {
        videoId = urlObj.searchParams.get('v');
      }
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    // Vimeo
    if (urlObj.hostname.includes('vimeo.com')) {
      const videoId = urlObj.pathname.split('/').pop();
      if (videoId && !isNaN(videoId)) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }

    // PDF
    if (url.toLowerCase().endsWith('.pdf')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }

    return url;
  } catch (e) {
    return url;
  }
};

export const getLinkType = (url) => {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    // Prioritize specific types
    if (hostname.includes('docs.google.com') && hostname.includes('/presentation/')) return 'Google Slides';
    if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) return 'Google Drive';

    if (hostname.includes('canva.com')) return 'Canva';
    if (hostname.includes('figma.com')) return 'Figma';

    // Microsoft
    if (hostname.includes('powerpoint.office.com')) return 'PowerPoint';
    if (hostname.includes('onedrive.live.com') || hostname.includes('sharepoint.com')) return 'OneDrive';

    if (hostname.includes('prezi.com')) return 'Prezi';
    if (hostname.includes('pitch.com')) return 'Pitch';
    if (hostname.includes('youtube') || hostname.includes('youtu.be')) return 'YouTube';
    if (hostname.includes('vimeo.com')) return 'Vimeo';

    if (hostname.includes('github.com')) return 'GitHub';
    if (hostname.includes('gitlab.com')) return 'GitLab';
    if (hostname.includes('docs.google.com') && hostname.includes('/document/')) return 'Google Docs';

    // File extensions
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith('.pdf')) return 'PDF';
    if (pathname.endsWith('.doc') || pathname.endsWith('.docx')) return 'Word';

    return 'Link';
  } catch { return 'Link'; }
};

export const isEmbeddable = (url) => {
  if (!url) return false;
  const type = getLinkType(url);
  const embeddableTypes = [
    'Google Slides', 'Canva', 'Figma', 'PowerPoint', 'OneDrive',
    'Prezi', 'Pitch', 'YouTube', 'Vimeo', 'PDF', 'Google Docs'
  ];
  return embeddableTypes.includes(type);
};
