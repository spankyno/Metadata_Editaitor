
import * as piexif from 'piexifjs';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Define standard tags we want to support editing for
export const KNOWN_TAGS = {
  '0th': [
    { id: piexif.ImageIFD.Make, label: 'Fabricante', key: 'Make' },
    { id: piexif.ImageIFD.Model, label: 'Modelo', key: 'Model' },
    { id: piexif.ImageIFD.Software, label: 'Software', key: 'Software' },
    { id: piexif.ImageIFD.DateTime, label: 'Fecha/Hora', key: 'DateTime' },
    { id: piexif.ImageIFD.Artist, label: 'Artista', key: 'Artist' },
    { id: piexif.ImageIFD.Copyright, label: 'Copyright', key: 'Copyright' },
    { id: piexif.ImageIFD.ImageDescription, label: 'Descripción', key: 'ImageDescription' },
  ],
  'Exif': [
    { id: piexif.ExifIFD.LensMake, label: 'Fabr. Lente', key: 'LensMake' },
    { id: piexif.ExifIFD.LensModel, label: 'Modelo Lente', key: 'LensModel' },
    { id: piexif.ExifIFD.UserComment, label: 'Comentario', key: 'UserComment' },
    { id: piexif.ExifIFD.DateTimeOriginal, label: 'Fecha Original', key: 'DateTimeOriginal' },
    { id: piexif.ExifIFD.ExposureTime, label: 'Exp. (s)', key: 'ExposureTime' },
    { id: piexif.ExifIFD.FNumber, label: 'Apertura (f)', key: 'FNumber' },
    { id: piexif.ExifIFD.ISOSpeedRatings, label: 'ISO', key: 'ISOSpeedRatings' },
  ],
  'GPS': [
    { id: piexif.GPSIFD.GPSLatitude, label: 'Latitud', key: 'GPSLatitude' },
    { id: piexif.GPSIFD.GPSLongitude, label: 'Longitud', key: 'GPSLongitude' },
    { id: piexif.GPSIFD.GPSAltitude, label: 'Altitud', key: 'GPSAltitude' },
  ]
};

export const getMetadataFromBase64 = (base64: string) => {
  try {
    const exifObj = piexif.load(base64);
    return exifObj;
  } catch (e) {
    console.warn("Could not load EXIF, might be missing headers.", e);
    return { '0th': {}, 'Exif': {}, 'GPS': {}, '1st': {}, 'thumbnail': null };
  }
};

export const injectMetadataToBase64 = (base64: string, exifObj: any) => {
  try {
    const exifStr = piexif.dump(exifObj);
    return piexif.insert(exifStr, base64);
  } catch (e) {
    console.error("Error injecting EXIF:", e);
    return base64;
  }
};

// Helper to format values for display
export const formatExifValue = (val: any): string => {
  if (val === undefined || val === null) return '';
  if (Array.isArray(val)) {
    if (val.length === 2 && typeof val[0] === 'number') {
      return (val[0] / val[1]).toString(); // Handle rational numbers
    }
    return JSON.stringify(val);
  }
  return String(val);
};

// Helper to parse string values back to EXIF-compatible types
export const parseExifValue = (val: string, tagId: number): any => {
  // Very basic parsing - in a production app we'd need tag-specific logic
  // Especially for rationals and byte arrays
  if (!val) return undefined;
  if (!isNaN(Number(val)) && val.trim() !== '') return Number(val);
  return val;
};
