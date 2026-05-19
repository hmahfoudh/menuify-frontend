type TableShape  = 'SQUARE' | 'RECTANGLE' | 'ROUND';
type TableStatus = 'FREE' | 'PENDING' | 'PREPARING' | 'READY';
type PanelMode   = 'create' | 'edit';

interface TableResponse {
  id:           string;
  number:       number;
  label:        string | null;
  displayName:  string;
  seats:        number;
  shape:        TableShape;
  active:       boolean;
  // QR fields
  qrCode:       string;
  qrTargetUrl:  string;
  qrColorDark:  string;
  qrColorLight: string;
  qrEmbedLogo:  boolean;
  qrScanCount:  number;
}

interface TableStatusResponse extends TableResponse {
  status:         TableStatus;
  orderId:        string | null;
  orderReference: string | null;
}