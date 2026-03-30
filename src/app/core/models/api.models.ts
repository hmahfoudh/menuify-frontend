export interface ApiResponse<T> {
  success:   boolean;
  message:   string;
  data:      T;
  timestamp: string;
}

export interface PageResponse<T> {
  content:       T[];
  page:          number;
  size:          number;
  totalElements: number;
  totalPages:    number;
  last:          boolean;
}

export interface ErrorResponse{
  code: string;
  message: string;
  errors?: { [field: string]: string };
  timestamp: string;
}