
export namespace Formatter {

    export const pad = (str: string, width: number): string => {
        const padding = new Array(width - str.length).fill(' ').join('');
        return str + padding;
    };

    export const table = (rows: string[][], gap: number = 1): string => {
        const widths: number[] = [];
        const gapStr = new Array(gap).fill(' ').join('');

        rows.forEach(cols => {
            cols.forEach((value, i) => {
                widths[i] = Math.max(widths[i] || 0, value.length);
            });
        });

        return rows.map(cols => {
            return cols
                .map((value, i) => pad(value, widths[i]))
                .join(gapStr);
        }).join('\n');
    };
}