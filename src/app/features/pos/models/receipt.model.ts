import { PosCartItem } from './pos.models';

/**
 * Structured data model passed to ReceiptPdfService.
 * Assembled by PosComponent from its own signals — no DOM access required.
 */
export interface Receipt {
  /** Restaurant / tenant display name shown at the top of the receipt */
  restaurantName: string;

  /** Human-readable order reference, e.g. "ORD-0042" */
  orderRef: string;

  /** Optional table number or label; null for takeaway / no-table orders */
  tableNumber: string | null;

  /** ISO timestamp when the receipt was generated (new Date().toISOString()) */
  issuedAt: string;

  /** Line items as they were in the cart at order time */
  lines: ReceiptLine[];

  /** Raw subtotal before discount (same unit as prices: 3-decimal TND) */
  subtotal: number;

  /** Discount amount applied (0 when none) */
  discount: number;

  /** Tip amount (0 when none) */
  tip: number;

  /** Final amount due = subtotal − discount + tip */
  total: number;

  /** Cash tendered by the customer (undefined for card payments) */
  amountTendered?: number;

  /** Change returned to the customer (undefined for card payments) */
  change?: number;

  /** Payment method used */
  paymentMethod: 'CASH' | 'CARD' | 'MIXED';

  /**
   * Optional base-64 encoded PNG of the restaurant logo.
   * When provided the service renders it at the top of the receipt.
   * Omit or pass undefined to skip the logo block.
   */
  logoBase64?: string;

  /**
   * Optional URL or base-64 string for a QR code image.
   * Pass in a pre-rendered QR PNG (e.g. from angularx-qrcode's toDataURL).
   * Omit to skip.
   */
  qrCodeBase64?: string;

  /** Free-form footer message, e.g. "Merci pour votre visite !" */
  footerMessage?: string;
}

/** A single line on the printed receipt */
export interface ReceiptLine {
  /** Display name of the menu item */
  name: string;

  /** Variant name, if any (e.g. "Large") */
  variantName?: string;

  /** Selected modifier names joined for display (e.g. "Sans gluten, Extra fromage") */
  modifiers?: string;

  /** Staff note attached to the line */
  note?: string;

  /** Quantity ordered */
  quantity: number;

  /** Unit price (after variant / modifier adjustments) */
  unitPrice: number;

  /** Line total = quantity × unitPrice */
  lineTotal: number;
}

// ─── Helper: build a Receipt from PosComponent signals ──────────────────────
//
// Call this inside PosComponent.printReceipt() to assemble the model:
//
//   const receipt = buildReceiptFromPos({
//     restaurantName : this.tenantName(),
//     orderRef       : this.lastOrderRef() ?? '',
//     tableNumber    : this.receiptTable(),
//     lines          : this.receiptLines(),
//     subtotal       : this.receiptSubtotal(),
//     discount       : this.discountAmount(),
//     tip            : parseFloat(this.tipInput()) || 0,
//     total          : this.pendingTotal(),
//     amountTendered : parseFloat(this.tenderedInput()) || undefined,
//     change         : this.changeAmount() || undefined,
//     paymentMethod  : ({ cash: 'CASH', card: 'CARD', mixed: 'MIXED' } as const)[this.paymentType()],
//   });
//
export function buildReceiptFromPos(params: {
  restaurantName : string;
  orderRef       : string;
  tableNumber    : string | null;
  lines          : PosCartItem[];
  subtotal       : number;
  discount       : number;
  tip            : number;
  total          : number;
  amountTendered?: number;
  change?        : number;
  paymentMethod  : Receipt['paymentMethod'];
  logoBase64?    : string;
  qrCodeBase64?  : string;
  footerMessage? : string;
}): Receipt {
  return {
    restaurantName : params.restaurantName,
    orderRef       : params.orderRef,
    tableNumber    : params.tableNumber,
    issuedAt       : new Date().toISOString(),
    lines          : params.lines.map(c => ({
      name       : c.itemName,
      variantName: c.variant?.name,
      modifiers  : c.modifiers.length ? c.modifiers.map(m => m.name).join(', ') : undefined,
      note       : c.note || undefined,
      quantity   : c.quantity,
      unitPrice  : c.unitPrice,
      lineTotal  : +(c.unitPrice * c.quantity).toFixed(3),
    })),
    subtotal       : params.subtotal,
    discount       : params.discount,
    tip            : params.tip,
    total          : params.total,
    amountTendered : params.amountTendered,
    change         : params.change,
    paymentMethod  : params.paymentMethod,
    logoBase64     : params.logoBase64,
    qrCodeBase64   : params.qrCodeBase64,
    footerMessage  : params.footerMessage ?? 'Merci pour votre visite !',
  };
}