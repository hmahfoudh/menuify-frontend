export interface QrCodeResponse {
  id:           string;
  code:         string;
  label:        string | null;
  tableNumber:  string | null;
  targetUrl:    string;
  imageUrlPng:  string | null;
  imageUrlSvg:  string | null;
  colorDark:    string;
  colorLight:   string;
  embedLogo:    boolean;
  scanCount:    number;
  active:       boolean;
  createdAt:    string;
}

export interface QrCodeRequest {
  label?:       string;
  tableNumber?: string;
  colorDark?:   string;
  colorLight?:  string;
  embedLogo:    boolean;
}

export interface ApiResponse<T> {
  success:   boolean;
  message:   string;
  data:      T;
  timestamp: string;
}