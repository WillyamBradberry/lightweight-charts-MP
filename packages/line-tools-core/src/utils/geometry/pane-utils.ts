// /src/utils/geometry/pane-utils.ts

import { LineToolsCorePlugin } from '../../core-plugin';

/**
 * Returns the height of the pane that contains the provided series.
 */
export function getPaneHeightForSeries(coreApi: LineToolsCorePlugin<any>, series: any): number {
    const layout = coreApi.getLayout();
    const myPane = layout.panes.find(p => p.series.indexOf(series) !== -1);
    return myPane ? myPane.height : 0;
}
