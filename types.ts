
export interface AttachedImage {
  name: string;
  dataUrl: string;
}

export interface RawDataForm {
  testLocation: string;
  receptionNumber: string;
  inspectStartDate: string;
  inspectEndDate: string;
  model: string;
  serialNumber: string;
  spanFilm: string;
  midFilm: string;
  span1: string;
  flowRate: string;
  repeat1: string;
  linearity: string;
  repeat2: string;
  blank1: string;
  repeat3: string;
  blank2: string;
  span2: string;
  blank3: string;
  // File Attachment field (Changed to array for multiple images)
  attachedImages: AttachedImage[];
}

export const INITIAL_FORM_DATA: RawDataForm = {
  testLocation: '',
  receptionNumber: '',
  inspectStartDate: new Date().toISOString().split('T')[0],
  inspectEndDate: new Date().toISOString().split('T')[0],
  model: '',
  serialNumber: '',
  spanFilm: '',
  midFilm: '',
  span1: '',
  flowRate: '',
  repeat1: '',
  linearity: '',
  repeat2: '',
  blank1: '',
  repeat3: '',
  blank2: '',
  span2: '',
  blank3: '',
  attachedImages: [],
};

export enum AppMode {
  CHAT = 'chat',
  IMAGE = 'image',
  LIVE = 'live',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  isError?: boolean;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: number;
}
