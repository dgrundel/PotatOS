export var Formatter;
(function (Formatter) {
    Formatter.pad = (str, width) => {
        const padding = new Array(width - str.length).fill(' ').join('');
        return str + padding;
    };
    Formatter.table = (rows, gap = 1) => {
        const widths = [];
        const gapStr = new Array(gap).fill(' ').join('');
        rows.forEach(cols => {
            cols.forEach((value, i) => {
                widths[i] = Math.max(widths[i] || 0, value.length);
            });
        });
        return rows.map(cols => {
            return cols
                .map((value, i) => Formatter.pad(value, widths[i]))
                .join(gapStr);
        }).join('\n');
    };
})(Formatter || (Formatter = {}));
