// src/app/features/pos/services/receipt-pdf.service.ts
//
// Install dependency (once):
//   npm install pdfmake
//   npm install --save-dev @types/pdfmake
//
// pdfmake is a client-side-only library — this service is fully SSR-safe
// because it lazy-imports pdfmake inside an isPlatformBrowser guard.

import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT }      from '@angular/common';
import type { TDocumentDefinitions, ContentTable, ContentText, ContentImage, ContentColumns } from 'pdfmake/interfaces';
import { Receipt }                          from '../models/receipt.model';

// ─── Thermal receipt page dimensions ─────────────────────────────────────────
// 80 mm wide paper → 226.77 pt  (1 mm = 2.8346 pt)
// Height is dynamic (auto), so we use A4 height as a safe upper bound and let
// pdfmake clip/scroll; the print dialog will handle actual paper length.
const PAGE_WIDTH  = 226.77;          // 80 mm in pt
const PAGE_HEIGHT = 841.89;          // A4 height — replaced by 'auto' below
const MARGIN_H    = 10;              // horizontal margin in pt
const CONTENT_W   = PAGE_WIDTH - MARGIN_H * 2;

// ─── Colour palette ───────────────────────────────────────────────────────────
const COLOR = {
  black     : '#1a1a1a',
  muted     : '#555555',
  divider   : '#cccccc',
  accent    : '#c9a96e',           // Menuify gold — matches platform theme
  white     : '#ffffff',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
// pdfmake ships Roboto by default. We keep it for clean French character support.
const FONT = {
  RESTAURANT : { fontSize: 13, bold: true,  color: COLOR.black,  alignment: 'center' as const },
  HEADING    : { fontSize: 8,  bold: true,  color: COLOR.black  },
  NORMAL     : { fontSize: 8,  bold: false, color: COLOR.black  },
  SMALL      : { fontSize: 7,  bold: false, color: COLOR.muted  },
  TOTAL_LABEL: { fontSize: 9,  bold: true,  color: COLOR.black  },
  TOTAL_VALUE: { fontSize: 9,  bold: true,  color: COLOR.black, alignment: 'right' as const },
  GRAND_TOTAL: { fontSize: 11, bold: true,  color: COLOR.black  },
  FOOTER     : { fontSize: 7,  bold: false, color: COLOR.muted,  alignment: 'center' as const, italics: true },
};

@Injectable({ providedIn: 'root' })
export class ReceiptPdfService {

  private platformId       = inject(PLATFORM_ID);
  private document         = inject(DOCUMENT);
  private pdfMakeInstance: any = null;

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generate a vector PDF receipt and open the browser print dialog.
   * No-op when called in an SSR context.
   *
   * @param receipt  Structured receipt data assembled by PosComponent.
   */
  async printReceipt(receipt: Receipt): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const pdfMake = await this.loadPdfMake();
    pdfMake.createPdf(this.buildDocDefinition(receipt)).open();
  }

  /**
   * Same as printReceipt() but returns a Blob instead of opening the dialog.
   * Useful for upload / archiving flows.
   */
  async getReceiptBlob(receipt: Receipt): Promise<Blob> {
    const pdfMake = await this.loadPdfMake();
    return pdfMake.createPdf(this.buildDocDefinition(receipt)).getBlob();
  }


  private loadPdfMake(): Promise<any> {
    if (this.pdfMakeInstance) return Promise.resolve(this.pdfMakeInstance);
    return this.loadViaScript();
  }

  /**
   * Most reliable strategy for pdfmake 0.3.x + Angular esbuild:
   * Load both scripts via <script> tags so they execute in global scope
   * and pdfmake can self-register its VFS correctly.
   * pdfmake.js sets window.pdfMake; vfs_fonts.js sets window.pdfMake.vfs.
   */
  private loadViaScript(): Promise<any> {
    return new Promise((resolve, reject) => {
      const doc = this.document;

      const onReady = () => {
        this.pdfMakeInstance = (window as any).pdfMake;
        resolve(this.pdfMakeInstance);
      };

      // If already loaded by a previous call
      if ((window as any).pdfMake?.vfs) { onReady(); return; }

      const loadScript = (src: string): Promise<void> =>
        new Promise((res, rej) => {
          const existing = doc.querySelector(`script[src="${src}"]`);
          if (existing) { res(); return; }
          const s = doc.createElement('script');
          s.src = src;
          s.onload  = () => res();
          s.onerror = () => rej(new Error(`Failed to load ${src}`));
          doc.head.appendChild(s);
        });

      // Scripts must load in order: pdfmake first, then vfs_fonts
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.12/pdfmake.min.js')
        .then(() => loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.12/vfs_fonts.min.js'))
        .then(() => onReady())
        .catch(reject);
    });
  }

  // ── Document definition builder ────────────────────────────────────────────

  private buildDocDefinition(r: Receipt): TDocumentDefinitions {
    const content: any[] = [];

    // 1. Logo (optional)
    if (r.logoBase64) {
      content.push(this.logoBlock(r.logoBase64));
    }

    // 2. Restaurant name
    content.push({ text: r.restaurantName.toUpperCase(), ...FONT.RESTAURANT, margin: [0, r.logoBase64 ? 6 : 0, 0, 4] });

    // 3. Separator
    content.push(this.separator());

    // 4. Order meta (ref + date + table)
    content.push(this.metaBlock(r));

    // 5. Separator
    content.push(this.separator());

    // 6. Items table
    content.push(this.itemsTable(r));

    // 7. Separator
    content.push(this.separator());

    // 8. Totals block
    content.push(this.totalsBlock(r));

    // 9. Payment method
    content.push(this.separator());
    content.push(this.paymentBlock(r));

    // 10. QR code (optional)
    if (r.qrCodeBase64) {
      content.push(this.separator());
      content.push(this.qrBlock(r.qrCodeBase64));
    }

    // 11. Footer
    content.push(this.separator());
    content.push(this.footerBlock(r));

    return {
      pageSize   : { width: PAGE_WIDTH, height: 'auto' as any },
      pageMargins: [MARGIN_H, 12, MARGIN_H, 12],
      defaultStyle: { font: 'Roboto', fontSize: 8, color: COLOR.black },
      content,
    };
  }

  // ── Section builders ───────────────────────────────────────────────────────

  private logoBlock(base64: string): ContentImage {
    return {
      image : base64,
      width : 60,
      alignment: 'center',
      margin: [0, 0, 0, 6],
    };
  }

  private separator(margin: [number,number,number,number] = [0, 4, 0, 4]): ContentText {
    // Unicode box-drawing dashes as a visual divider — no image required
    return {
      text     : '─'.repeat(34),
      fontSize : 7,
      color    : COLOR.divider,
      alignment: 'center',
      margin,
    };
  }

  private metaBlock(r: Receipt): any {
    const date = new Date(r.issuedAt);
    const dateStr = date.toLocaleDateString('fr-TN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' });

    const rows: ContentColumns[] = [
      this.metaRow('N° Commande',  r.orderRef),
      this.metaRow('Date',         `${dateStr}  ${timeStr}`),
    ];

    if (r.tableNumber) {
      rows.push(this.metaRow('Table', `N° ${r.tableNumber}`));
    }

    return { stack: rows, margin: [0, 2, 0, 2] };
  }

  private metaRow(label: string, value: string): ContentColumns {
    return {
      columns: [
        { text: label, ...FONT.SMALL, width: '*' },
        { text: value, ...FONT.SMALL, bold: true, alignment: 'right', width: 'auto' },
      ],
      margin: [0, 1, 0, 1],
    };
  }

  private itemsTable(r: Receipt): ContentTable {
    const headerRow = [
      { text: 'Article',  ...FONT.HEADING, border: [false,false,false,true], borderColor: [COLOR.divider, COLOR.divider, COLOR.divider, COLOR.divider] },
      { text: 'Qté',      ...FONT.HEADING, alignment: 'center' as const, border: [false,false,false,true], borderColor: [COLOR.divider, COLOR.divider, COLOR.divider, COLOR.divider] },
      { text: 'P.U.',     ...FONT.HEADING, alignment: 'right'  as const, border: [false,false,false,true], borderColor: [COLOR.divider, COLOR.divider, COLOR.divider, COLOR.divider] },
      { text: 'Total',    ...FONT.HEADING, alignment: 'right'  as const, border: [false,false,false,true], borderColor: [COLOR.divider, COLOR.divider, COLOR.divider, COLOR.divider] },
    ];

    const itemRows = r.lines.flatMap(line => {
      const nameText = line.variantName ? `${line.name}\n${line.variantName}` : line.name;
      const mainRow = [
        { text: nameText,                            ...FONT.NORMAL, border: this.noBorder() },
        { text: String(line.quantity),               ...FONT.NORMAL, alignment: 'center' as const, border: this.noBorder() },
        { text: this.fmt(line.unitPrice),            ...FONT.NORMAL, alignment: 'right'  as const, border: this.noBorder() },
        { text: this.fmt(line.lineTotal),            ...FONT.NORMAL, alignment: 'right'  as const, border: this.noBorder() },
      ];

      const extraRows: any[][] = [];

      if (line.modifiers) {
        extraRows.push([
          { text: `  + ${line.modifiers}`, ...FONT.SMALL, colSpan: 4, border: this.noBorder() },
          {}, {}, {},
        ]);
      }
      if (line.note) {
        extraRows.push([
          { text: `  ✎ ${line.note}`, ...FONT.SMALL, color: COLOR.muted, colSpan: 4, border: this.noBorder() },
          {}, {}, {},
        ]);
      }

      return [mainRow, ...extraRows];
    });

    return {
      table: {
        widths : ['*', 24, 44, 44],
        body   : [headerRow, ...itemRows],
      },
      layout: {
        hLineWidth : () => 0.5,
        vLineWidth : () => 0,
        hLineColor : () => COLOR.divider,
        paddingTop : () => 2,
        paddingBottom: () => 2,
        paddingLeft  : () => 0,
        paddingRight : () => 0,
      },
      margin: [0, 4, 0, 4],
    };
  }

  private totalsBlock(r: Receipt): any {
    const rows: ContentColumns[] = [];

    rows.push(this.totalRow('Sous-total',   this.fmt(r.subtotal)));

    if (r.discount > 0) {
      rows.push(this.totalRow('Remise',      `- ${this.fmt(r.discount)}`, COLOR.muted));
    }
    if (r.tip > 0) {
      rows.push(this.totalRow('Pourboire',   this.fmt(r.tip)));
    }

    // Grand total with a visual accent
    rows.push({
      columns: [
        { text: 'NET À PAYER', ...FONT.GRAND_TOTAL, width: '*' },
        { text: `${this.fmt(r.total)} DT`, ...FONT.GRAND_TOTAL, alignment: 'right', width: 'auto' },
      ],
      margin: [0, 3, 0, 1],
    });

    if (r.amountTendered !== undefined) {
      rows.push(this.totalRow('Espèces reçues',    this.fmt(r.amountTendered)));
    }
    if (r.change !== undefined && r.change > 0) {
      rows.push(this.totalRow('Monnaie rendue',    this.fmt(r.change), COLOR.black, true));
    }

    return { stack: rows, margin: [0, 2, 0, 2] };
  }

  private totalRow(label: string, value: string, color: string = COLOR.black, bold = false): ContentColumns {
    return {
      columns: [
        { text: label, ...FONT.TOTAL_LABEL, bold, color, width: '*' },
        { text: value, ...FONT.TOTAL_VALUE, bold, color              },
      ],
      margin: [0, 1, 0, 1],
    };
  }

  private paymentBlock(r: Receipt): any {
    const METHOD_LABEL: Record<Receipt['paymentMethod'], string> = {
      CASH : 'Espèces',
      CARD : 'Carte bancaire',
      MIXED: 'Mixte (espèces + carte)',
    };
    return {
      columns: [
        { text: 'Mode de paiement', ...FONT.SMALL, width: '*' },
        { text: METHOD_LABEL[r.paymentMethod], ...FONT.SMALL, bold: true, alignment: 'right', width: 'auto' },
      ],
      margin: [0, 2, 0, 2],
    };
  }

  private qrBlock(base64: string): ContentImage {
    return {
      image    : base64,
      width    : 64,
      alignment: 'center',
      margin   : [0, 6, 0, 6],
    };
  }

  private footerBlock(r: Receipt): any {
    return {
      stack: [
        { text: r.footerMessage ?? 'Merci pour votre visite !', ...FONT.FOOTER, margin: [0, 4, 0, 2] },
        { text: `© ${new Date().getFullYear()} ${r.restaurantName}`, ...FONT.FOOTER },
      ],
    };
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  /** Format a number as a 3-decimal TND string */
  private fmt(n: number): string {
    return n.toFixed(3);
  }

  /** All four borders disabled — used for table cell interiors */
  private noBorder(): [boolean, boolean, boolean, boolean] {
    return [false, false, false, false];
  }
}