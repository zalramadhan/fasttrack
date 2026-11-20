export const APP_NAME = "fasttrack";

export const LIFETIME_PRICE = Math.max(
  0,
  Number(process.env.LIFETIME_PRICE || 99000),
);

export const WHATSAPP_NUMBER = (process.env.WHATSAPP_NUMBER || "").replace(
  /\D/g,
  "",
);

export const FREE_MAX_SIDE = 720;
export const FREE_BITRATE_MBPS = 2;
export const PAID_BITRATE_MBPS = 12;
