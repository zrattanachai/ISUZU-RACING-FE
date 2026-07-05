export function toHttpFallbackUrl(streamUrl: string | null): string | null {
  if (!streamUrl) {
    return null;
  }

  if (/^wss:\/\//i.test(streamUrl)) {
    return streamUrl.replace(/^wss:\/\//i, 'https://');
  }

  if (/^ws:\/\//i.test(streamUrl)) {
    return streamUrl.replace(/^ws:\/\//i, 'http://');
  }

  return null;
}

export function toPreferredLiveUrl(streamUrl: string | null): string | null {
  if (!streamUrl) {
    return null;
  }

  return toHttpFallbackUrl(streamUrl) ?? streamUrl;
}

export function toYouTubeEmbedUrl(streamUrl: string | null): string | null {
  if (!streamUrl) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(streamUrl);
  } catch {
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
  let videoId: string | null = null;

  if (hostname === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v');
    } else {
      const [kind, id] = url.pathname.split('/').filter(Boolean);
      if (['embed', 'live', 'shorts'].includes(kind)) {
        videoId = id ?? null;
      }
    }
  }

  if (!videoId) {
    return null;
  }

  const embedUrl = new URL(
    `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`
  );
  embedUrl.searchParams.set('autoplay', '1');
  embedUrl.searchParams.set('mute', '1');
  embedUrl.searchParams.set('playsinline', '1');
  embedUrl.searchParams.set('rel', '0');

  return embedUrl.toString();
}

export function isYouTubeUrl(streamUrl: string | null): boolean {
  return Boolean(toYouTubeEmbedUrl(streamUrl));
}
