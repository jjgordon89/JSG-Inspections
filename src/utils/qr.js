import QRCode from 'qrcode';

export const generateQrCode = async (text) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      type: 'image/jpeg',
      quality: 0.3,
      margin: 1,
      color: {
        dark:"#010599FF",
        light:"#FFBF60FF"
      }
    });
    return qrCodeDataUrl;
  } catch (err) {
    console.error(err);
    return null;
  }
};