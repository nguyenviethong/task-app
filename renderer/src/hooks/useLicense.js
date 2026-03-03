import { useEffect, useState, useCallback } from "react";

export default function useLicense(api) {
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [expired, setExpired] = useState(false);
  const [activating, setActivating] = useState(false);
  const [restarting, setRestarting] = useState(false);

  // Tính số ngày còn lại
  const findDays = useCallback((info) => {
    let days = info?.days ?? 0;

    try {
      if (info?.exp) {
        const now = Date.now();
        const end = new Date(info.exp + "T07:59:59").getTime();
        days = Math.max(
          0,
          Math.ceil((end - now) / (1000 * 60 * 60 * 24))
        );
      }
    } catch (e) {}

    return days;
  }, []);

  // Load license lần đầu
  const checkLicense = useCallback(async () => {
    const info = await api.getLicenseStatus();
    setLicenseInfo(info);

    const days = findDays(info);

    if (info.type === "expired" || days <= 0) {
      setExpired(true);
    } else {
      setExpired(false);
    }
  }, [api, findDays]);

  useEffect(() => {
    checkLicense();
  }, [checkLicense]);

  // Auto check mỗi 60s
  useEffect(() => {
    const timer = setInterval(checkLicense, 60000);
    return () => clearInterval(timer);
  }, [checkLicense]);

  // Activate license
  const activate = useCallback(
    async (licenseKey) => {
      if (!licenseKey?.trim()) {
        throw new Error("License key is empty");
      }

      setActivating(true);

      try {
        const res = await api.activateOnline(licenseKey);

        if (!res.ok) {
          throw new Error(res.message || "Invalid key");
        }

        await checkLicense();

        setRestarting(true);
        setTimeout(() => {
          api.restart();
        }, 1200);

        return true;
      } finally {
        setActivating(false);
      }
    },
    [api, checkLicense]
  );

  return {
    licenseInfo,
    expired,
    activating,
    restarting,
    activate
  };
}