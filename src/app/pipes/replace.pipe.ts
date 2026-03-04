import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replace',
})
export class ReplacePipe implements PipeTransform {
  transform(value: string | null | undefined, searchValue: string, replaceValue: string): string {
    if (value == null || searchValue == null || replaceValue == null) {
      return value ?? '';
    }

    return value.split(searchValue).join(replaceValue);
  }
}
