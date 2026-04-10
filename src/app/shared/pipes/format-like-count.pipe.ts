import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatLikeCount',
  standalone: true
})
export class FormatLikeCountPipe implements PipeTransform {

  transform(count: number | null | undefined): string {
    if (count == null) return '0';
 
    if (count < 1000) {
      return count.toString();
    }
 
    if (count < 1_000_000) {
      const k = count / 1000;
      // If it's a whole number (1000, 2000, etc.), don't show decimal
      if (k === Math.floor(k)) {
        return `${Math.floor(k)}k`;
      }
      // Otherwise show one decimal place (1.2k, 1.5k, etc.)
      return `${k.toFixed(1)}k`;
    }
 
    // For millions (future-proofing)
    const m = count / 1_000_000;
    if (m === Math.floor(m)) {
      return `${Math.floor(m)}m`;
    }
    return `${m.toFixed(1)}m`;
  }

}
