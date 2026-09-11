export type EdgeSign = -1 | 0 | 1;

export type Edges = {
  top: EdgeSign;
  right: EdgeSign;
  bottom: EdgeSign;
  left: EdgeSign;
};

export type Difficulty = {
  id: string;
  label: string;
  hint: string;
  pieces: number;
};

export type GalleryImage = {
  id: string;
  src: string;
  title: string;
  place: string;
};

export type PuzzleConfig = {
  imageId: string;
  imageSrc: string;
  imageTitle: string;
  cols: number;
  rows: number;
};

export type PuzzleStats = {
  placed: number;
  total: number;
  elapsedMs: number;
  started: boolean;
  complete: boolean;
};

export type CompleteInfo = {
  elapsedMs: number;
  bestMs: number;
  isRecord: boolean;
  cols: number;
  rows: number;
  imageId: string;
  imageTitle: string;
};
