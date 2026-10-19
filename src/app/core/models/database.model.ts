export interface Book {
  id?: number;
  title: string;
  author?: string;
  coverPath?: string;
  filePath: string;
  language?: string;
  fileSize?: number;
  addedAt: number;
  isPinned?: boolean;
  lastReadAt?: number;
  finishedAt?: number;
  progress?: number;
}

export interface ReadingProgress {
  bookId: number;
  cfi: string;
  percentage: number;
  updatedAt: number;
}

export interface Bookmark {
  id?: number;
  bookId: number;
  cfi: string;
  note?: string;
  color?: string;
  createdAt: number;
}

export interface Highlight {
  id?: number;
  bookId: number;
  cfiRange: string;
  text: string;
  note?: string;
  color: string;
  createdAt: number;
}