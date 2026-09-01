export interface CalibrationData {
  id: string;
  sessionId: string;
  point1: { x: number; y: number };
  point2: { x: number; y: number };
  pixelDistance: number;
  realWorldDistanceMeters: number;
  metersPerPixel: number;
  calibratedAt: string;
}