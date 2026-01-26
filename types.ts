
export interface MetadataField {
  id: string;
  label: string;
  value: string;
  isEditing: boolean;
  group: '0th' | 'Exif' | 'GPS' | '1st';
}

export interface ImageData {
  file: File;
  previewUrl: string;
  base64: string;
  fields: MetadataField[];
}
