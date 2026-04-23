import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ 
  name: 'nl2br',
  standalone: true
})
export class Nl2brPipe implements PipeTransform {
  transform(value: string): string {
    return value ? value.replace(/\n/g, '<br>') : '';
  }
}
