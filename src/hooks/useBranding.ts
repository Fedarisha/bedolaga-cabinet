import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTelegramSDK, setCachedFullscreenEnabled } from '@/hooks/useTelegramSDK';
import {
  brandingApi,
  getCachedBranding,
  setCachedBranding,
  preloadLogo,
  isLogoPreloaded,
} from '@/api/branding';
import { useLogoBlobUrl } from '@/hooks/useLogoBlobUrl';

const FALLBACK_NAME = import.meta.env.VITE_APP_NAME || 'Cabinet';
const FALLBACK_LOGO = import.meta.env.VITE_APP_LOGO || 'V';

export function useBranding() {
  const { isTelegramWebApp, requestFullscreen, isMobile } = useTelegramSDK();

  // Branding data
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => {
      const data = await brandingApi.getBranding();
      setCachedBranding(data);
      await preloadLogo(data);
      return data;
    },
    initialData: getCachedBranding() ?? undefined,
    initialDataUpdatedAt: 0,
    staleTime: 60000,
  });

  const appName = branding ? branding.name : FALLBACK_NAME;
  const logoLetter = branding?.logo_letter || FALLBACK_LOGO;
  const hasCustomLogo = branding?.has_custom_logo || false;
  const logoUrl = useLogoBlobUrl();

  // Set document title. The public landing (/home) owns its own title.
  useEffect(() => {
    if (window.location.pathname === '/home') return;
    document.title = appName || 'VPN';
  }, [appName]);

  // Fullscreen setting from server
  const { data: fullscreenSetting } = useQuery({
    queryKey: ['fullscreen-enabled'],
    queryFn: brandingApi.getFullscreenEnabled,
    staleTime: 60000,
  });

  const fullscreenRequestedRef = useRef(false);

  useEffect(() => {
    if (!fullscreenSetting || !isTelegramWebApp) return;
    setCachedFullscreenEnabled(fullscreenSetting.enabled);
    if (fullscreenSetting.enabled && isMobile && !fullscreenRequestedRef.current) {
      fullscreenRequestedRef.current = true;
      requestFullscreen();
    }
  }, [fullscreenSetting, isTelegramWebApp, requestFullscreen, isMobile]);

  return {
    appName,
    logoLetter,
    hasCustomLogo,
    logoUrl,
    isLogoPreloaded,
  };
}
